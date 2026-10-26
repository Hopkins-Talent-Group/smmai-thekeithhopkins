from smm.domain.models import ContentDraft, DraftStatus, PublishResult, BrandProfile
from smm.moderation.policy import ModerationService
from smm.domain.models import BrandProfile
from smm.publishing.ports import Publisher
from uuid import uuid4
from datetime import datetime, timezone


def _new_approval_id():
    return str(uuid4())


class PublishingService:
    def __init__(self, publisher: Publisher, moderation: ModerationService):
        self.publisher = publisher
        self.moderation = moderation

    def publish(self, draft: ContentDraft, brand: BrandProfile, *, approved: bool, dry_run: bool = True) -> PublishResult:
        moderation = self.moderation.validate(draft, brand)
        if not moderation.approved:
            draft.status = DraftStatus.REJECTED
            return PublishResult(draft.platform, False, None, "; ".join(moderation.reasons), dry_run)
        if not approved:
            return PublishResult(draft.platform, False, None, "human approval required", dry_run)
        
        # Check if draft has been edited since last approval by comparing
        # the approved revision hash stored in draft metadata
        stored_hash = draft.metadata.get("approved_revision_hash")
        if stored_hash is not None:
            current_hash = hash(draft.text + str(draft.hashtags))
            if stored_hash != current_hash:
                # Content has been edited after approval - invalidate approval
                draft.status = DraftStatus.DRAFT
                draft.metadata = {k: v for k, v in draft.metadata.items() if k != "approved_revision_hash"}
                return PublishResult(draft.platform, False, None, "content edited after approval - approval invalidated", dry_run)
        
        # Record approval revision binding in draft metadata
        approval_id = _new_approval_id()
        current_hash = hash(draft.text + str(draft.hashtags))
        draft.metadata = {**draft.metadata, "approved_revision_id": approval_id, "approved_revision_hash": current_hash}
        
        result = self.publisher.publish(draft, dry_run=dry_run)
        if result.success and not result.dry_run:
            draft.status = DraftStatus.PUBLISHED
        
        return PublishResult(draft.platform, True, None, "Published with approval revision", dry_run)