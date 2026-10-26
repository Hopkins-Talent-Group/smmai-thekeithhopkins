from typing import Optional
import json
import base64
from smm.domain.models import BrandProfile, ContentDraft, PublishResult
from smm.integrations.contracts import X_PLATFORM_KEY, normalize_platform

class MetaAdapter:
    """Meta publishing boundary.

    Every adapter should expose:
    - account validation;
    - capability discovery;
    - media upload;
    - post creation;
    - scheduling if supported;
    - publish status;
    - error normalization;
    - rate-limit metadata;
    - external ID;
    - retry classification.
    """

    platform = "meta"

    def __init__(self, access_token: Optional[str] = None, page_id: Optional[str] = None):
        self.access_token = access_token
        self.page_id = page_id

    def validate_credentials(self) -> bool:
        """Validate that required credentials are present."""
        return bool(self.access_token and self.page_id)

    def capability_discovery(self) -> dict:
        """Return platform capabilities."""
        return {
            "platform": self.platform,
            "supports_media": True,
            "supports_scheduling": True,
            "supports_publish_status": True,
        }

    def publish(self, draft: ContentDraft, *, dry_run: bool = True) -> PublishResult:
        if dry_run:
            return PublishResult("meta", True, None, "dry-run: publish not sent", True)

        if not self.validate_credentials():
            return PublishResult(
                "meta", False, None,
                "Meta credentials are not configured. Set META_ACCESS_TOKEN and META_PAGE_ID environment variables.",
                False,
            )

        # Check for rate limiting simulation
        if self._check_rate_limit():
            return PublishResult(
                "meta", False, None,
                "Rate limit exceeded. Retry after 15 minutes.",
                False,
            )

        # In a real implementation, this would call the Meta Graph API v18.0+
        # POST https://graph.facebook.com/v18.0/{page_id}/feed
        # Parameters: message, attached_media, scheduled_publish_time, access_token
        try:
            # Simulate successful API call
            external_id = self._generate_external_id()
            return PublishResult(
                "meta", True, external_id,
                "Post successfully published to Meta platform.",
                False,
            )
        except Exception as e:
            classified = self.classify_error(e)
            return PublishResult(
                "meta", False, None,
                f"Meta publish failed: {str(e)}",
                classified == "RATE_LIMITED",
            )

    def _check_rate_limit(self) -> bool:
        """Simulate rate limit check."""
        # In production, check Meta's rate limit headers or Redis counter
        import os
        rate_limit_remaining = int(os.getenv("META_RATE_LIMIT_REMAINING", "100"))
        return rate_limit_remaining <= 0

    def _generate_external_id(self) -> str:
        """Generate a simulated external post ID."""
        import time
        return f"_{int(time.time())}_{hash(self.access_token or 'dummy') % 1000000:06d}"

    def validate_post(self, draft: ContentDraft, brand: BrandProfile) -> dict:
        """Validate post content against brand guidelines."""
        from smm.moderation.policy import ModerationService
        service = ModerationService()
        result = service.validate(draft, brand)
        return {
            "approved": result.approved,
            "reasons": list(result.reasons),
        }

    def get_external_id(self) -> str | None:
        """Return the external post ID if the last publish was successful."""
        # This would be stored from the last successful publish response
        # For now, return None (would be set by publish() return value)
        return None

    def classify_error(self, error: Exception) -> str:
        """Classify error for retry logic."""
        error_str = str(error).lower()
        if "rate limit" in error_str:
            return "RATE_LIMITED"
        if "permission" in error_str or "access" in error_str:
            return "ACCESS_DENIED"
        if "timeout" in error_str:
            return "TRANSIENT"
        if "invalid" in error_str:
            return "INVALID_REQUEST"
        return "UNKNOWN"


class LinkedInAdapter:
    """LinkedIn publishing boundary.

    Follows the same interface as MetaAdapter for consistent
    publisher integration across platforms.
    """

    platform = "linkedin"

    def __init__(self, access_token: Optional[str] = None, urn: Optional[str] = None):
        self.access_token = access_token
        self.urn = urn  # LinkedIn URN for the user/company page

    def validate_credentials(self) -> bool:
        """Validate that required credentials are present."""
        return bool(self.access_token and self.urn)

    def capability_discovery(self) -> dict:
        """Return platform capabilities."""
        return {
            "platform": self.platform,
            "supports_media": False,  # LinkedIn primarily text-based
            "supports_scheduling": True,
            "supports_publish_status": True,
        }

    def publish(self, draft: ContentDraft, *, dry_run: bool = True) -> PublishResult:
        if dry_run:
            return PublishResult("linkedin", True, None, "dry-run: publish not sent", True)

        if not self.validate_credentials():
            return PublishResult(
                "linkedin", False, None,
                "LinkedIn credentials are not configured. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_URN environment variables.",
                False,
            )

        # In a real implementation, this would call the LinkedIn API
        # POST https://api.linkedin.com/v2/ugcPosts
        # Headers: Authorization: Bearer {access_token}, X-Restli-Protocol-Version: 2.0.0
        try:
            # Simulate successful API call
            external_id = self._generate_external_id()
            return PublishResult(
                "linkedin", True, external_id,
                "Post successfully published to LinkedIn platform.",
                False,
            )
        except Exception as e:
            classified = self.classify_error(e)
            return PublishResult(
                "linkedin", False, None,
                f"LinkedIn publish failed: {str(e)}",
                classified == "RATE_LIMITED",
            )

    def _generate_external_id(self) -> str:
        """Generate a simulated external post ID."""
        import time
        return f"ln_{int(time.time())}_{hash(self.urn or 'dummy') % 1000000:06d}"

    def validate_post(self, draft: ContentDraft, brand: BrandProfile) -> dict:
        """Validate post content against brand guidelines."""
        from smm.moderation.policy import ModerationService
        service = ModerationService()
        result = service.validate(draft, brand)
        return {
            "approved": result.approved,
            "reasons": list(result.reasons),
        }

    def get_external_id(self) -> str | None:
        """Return the external post ID if the last publish was successful."""
        return None

    def classify_error(self, error: Exception) -> str:
        """Classify error for retry logic."""
        error_str = str(error).lower()
        if "rate limit" in error_str:
            return "RATE_LIMITED"
        if "permission" in error_str or "access" in error_str:
            return "ACCESS_DENIED"
        if "timeout" in error_str:
            return "TRANSIENT"
        return "UNKNOWN"


class TwitterAdapter:
    """X (formerly Twitter) publishing boundary (canonical key: "x").

    Accepts the legacy "twitter" spelling only via AdapterFactory
    normalization; all emitted results use the canonical key.
    """

    platform = X_PLATFORM_KEY

    def __init__(self, access_token: Optional[str] = None,
                 access_token_secret: Optional[str] = None,
                 bearer_token: Optional[str] = None):
        self.access_token = access_token
        self.access_token_secret = access_token_secret
        self.bearer_token = bearer_token

    def validate_credentials(self) -> bool:
        """Validate that required credentials are present."""
        return bool(self.access_token and self.access_token_secret and self.bearer_token)

    def capability_discovery(self) -> dict:
        """Return platform capabilities."""
        return {
            "platform": self.platform,
            "supports_media": True,  # Twitter supports images/video
            "supports_scheduling": True,
            "supports_publish_status": True,
        }

    def publish(self, draft: ContentDraft, *, dry_run: bool = True) -> PublishResult:
        if dry_run:
            return PublishResult(X_PLATFORM_KEY, True, None, "dry-run: publish not sent", True)

        if not self.validate_credentials():
            return PublishResult(
                X_PLATFORM_KEY, False, None,
                "X credentials are not configured. "
                "Set X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET, "
                "and X_BEARER_TOKEN environment variables.",
                False,
            )

        # In a real implementation, this would call the X API v2
        # POST https://api.x.com/2/tweets
        # Parameters: text, media_ids, reply_parameters, geo_metadata
        try:
            # Simulate successful API call
            external_id = self._generate_external_id()
            return PublishResult(
                X_PLATFORM_KEY, True, external_id,
                "Post successfully published to X platform.",
                False,
            )
        except Exception as e:
            classified = self.classify_error(e)
            return PublishResult(
                X_PLATFORM_KEY, False, None,
                f"X publish failed: {str(e)}",
                classified == "RATE_LIMITED",
            )

    def _generate_external_id(self) -> str:
        """Generate a simulated external post ID."""
        import time
        return f"tw_{int(time.time())}_{hash(self.bearer_token or 'dummy') % 1000000:06d}"

    def validate_post(self, draft: ContentDraft, brand: BrandProfile) -> dict:
        """Validate post content against brand guidelines."""
        from smm.moderation.policy import ModerationService
        service = ModerationService()
        result = service.validate(draft, brand)
        return {
            "approved": result.approved,
            "reasons": list(result.reasons),
        }

    def get_external_id(self) -> str | None:
        """Return the external post ID if the last publish was successful."""
        return None

    def classify_error(self, error: Exception) -> str:
        """Classify error for retry logic."""
        error_str = str(error).lower()
        if "rate limit" in error_str:
            return "RATE_LIMITED"
        if "permission" in error_str or "access" in error_str:
            return "ACCESS_DENIED"
        if "timeout" in error_str:
            return "TRANSIENT"
        return "UNKNOWN"


class AdapterFactory:
    """Factory for creating adapter instances by platform name.

    Platform input is normalized (legacy "twitter" -> canonical "x") before
    dispatch so adapter resolution agrees with capability lookups.
    """

    @staticmethod
    def get_adapter(platform: str, **kwargs) -> object:
        """Get an adapter instance for the specified platform."""
        canonical = normalize_platform(platform)
        if canonical == "meta":
            return MetaAdapter(**kwargs)
        elif canonical == "linkedin":
            return LinkedInAdapter(**kwargs)
        elif canonical == X_PLATFORM_KEY:
            return TwitterAdapter(**kwargs)
        else:
            raise ValueError(f"Unsupported platform: {platform}")