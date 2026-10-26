import json
import os
from datetime import datetime, timezone
from typing import Optional

import redis
from prisma import Prisma

from smm.domain.models import ContentDraft, DraftStatus
from smm.publishing.service import PublishingService
from smm.moderation.policy import ModerationService
from smm.integrations.adapters import MetaAdapter
from smm.config import get_settings

settings = get_settings()
redis_client = redis.from_url(os.getenv("REDIS_URL", "redis://your-redis-host:6379"))


PRIVATE_QUEUE = "smmai:schedule:cron"


def _is_dry_run() -> bool:
    return os.getenv("DRY_RUN", "true").lower() == "true"


def _get_prisma() -> Prisma:
    return Prisma()


async def schedule_publish_draft(draft_id: str, platform: str, workspace_id: str):
    """Schedule a draft for publishing by enqueuing it to the publish queue."""
    prisma = _get_prisma()
    await prisma.connect()

    try:
        # Find the draft
        draft = await prisma.contentDraft.find_unique({
            "where": {"id": draft_id},
        })

        if not draft:
            print(f"Draft {draft_id} not found")
            return False

        # Check if draft is in a publishable state
        if draft.status not in ("approved", "draft"):
            print(f"Draft {draft_id} status {draft.status} not publishable")
            return False

        # Generate idempotency key
        import hashlib
        import time
        idempotency_key = hashlib.sha256(
            f"{draft_id}-{platform}-{time.time()}".encode()
        ).hexdigest()

        # Check for existing job with same idempotency key
        existing = redis_client.get(f"publish_job:{idempotency_key}")
        if existing:
            print(f"Duplicate publish request ignored (idempotency key: {idempotency_key})")
            return True

        # Create publish job in database
        job_data = {
            "draftId": draft_id,
            "platform": platform,
            "status": "PENDING",
            "idempotencyKey": idempotency_key,
        }

        await prisma.publishJob.create(data=job_data)

        # Update draft status to SCHEDULED
        await prisma.contentDraft.update(
            {"where": {"id": draft_id}, "data": {"status": "SCHEDULED"}}
        )

        # Enqueue to Redis queue
        event = {
            "type": "publish.requested",
            "version": 1,
            "jobId": job_data["id"],
            "workflowId": "cron_scheduler",
            "workspaceId": workspace_id,
            "socialAccountId": platform,
            "contentRevisionId": draft_id,
            "idempotencyKey": idempotency_key,
        }

        redis_client.rpush(PRIVATE_QUEUE, json.dumps(event))

        print(
            f"Scheduled publish for draft {draft_id} on platform {platform} "
            f" (job_id: {job_data['id']}, idempotency: {idempotency_key})"
        )
        return True

    except Exception as e:
        print(f"Error scheduling publish for draft {draft_id}: {e}")
        return False
    finally:
        await prisma.disconnect()


async def process_schedule_queue():
    """Process the schedule queue - claimed by the publish worker."""
    # This is called by the publish worker to get scheduled jobs
    # Jobs are enqueued to the main publish queue by schedule_publish_draft
    pass


async def daily_cron_run():
    """Run the daily cron job - finds drafts ready for publishing and schedules them."""
    prisma = _get_prisma()
    await prisma.connect()

    try:
        # Find drafts in 'approved' state that haven't been scheduled yet
        # and aren't already in a publish job
        drafts = await prisma.contentDraft.find_many(
            {
                "where": {
                    "status": "approved",
                },
                take: 50,
            }
        )

        scheduled = 0
        for draft in drafts:
            # Skip if already scheduled or published
            if draft.status in ("scheduled", "published"):
                continue

            # Check if this draft has a brand associated
            # In a full implementation, would check brand/profile

            # Schedule for publishing
            result = await schedule_publish_draft(draft.id, "meta", draft.workspaceId or "default")
            if result:
                scheduled += 1

        print(f"Daily cron: scheduled {scheduled} drafts for publishing")
        return scheduled

    except Exception as e:
        print(f"Error in daily cron: {e}")
        return 0
    finally:
        await prisma.disconnect()


async def run_schedule_cycle():
    """Run one cycle of the scheduler - called by the background worker."""
    # This checks for any drafts that need scheduling and processes the queue
    # In production, this would be called by a time-based trigger
    await daily_cron_run()


def main():
    """Entry point for the scheduler daemon."""
    import asyncio

    print("Scheduler daemon started")

    # Run initial cron cycle
    asyncio.run(daily_cron_run())

    # In production, this would run on a timer (e.g., every 30 seconds)
    # or be triggered by a cron system
    print("Scheduler cycle complete")


if __name__ == "__main__":
    main()