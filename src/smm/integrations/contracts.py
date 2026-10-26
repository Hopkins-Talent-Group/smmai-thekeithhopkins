from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from smm.domain.models import ContentDraft, PublishResult

# Platforms supported by the planner. "twitter" is accepted as input and
# normalized to the canonical "x" key (see normalize_platform).
PLATFORMS = ("meta", "facebook", "instagram", "linkedin", "x", "tiktok", "youtube")

# Canonical key for the X platform. Adapter registries must use this so
# resolves go through normalization instead of raw string comparison.
X_PLATFORM_KEY = "x"

# Legacy aliases mapped to canonical keys before any capability lookup,
# adapter resolution, or API validation.
PLATFORM_ALIASES = {"twitter": "x"}



@dataclass(frozen=True)
class PlatformCapabilities:
    platform: str
    oauth: str = "oauth2"
    publish: bool = True
    media: bool = True
    scheduling: bool = True
    analytics: bool = True
    webhooks: bool = True
    phase: int = 2


class SocialAdapter(Protocol):
    platform: str

    def capability_discovery(self) -> dict: ...
    def publish(self, draft: ContentDraft, *, dry_run: bool = True) -> PublishResult: ...
    def classify_error(self, error: Exception) -> str: ...


PLATFORM_CAPABILITIES: dict[str, PlatformCapabilities] = {
    "meta": PlatformCapabilities("meta", phase=1),
    "facebook": PlatformCapabilities("facebook", phase=1),
    "instagram": PlatformCapabilities("instagram", phase=1),
    "linkedin": PlatformCapabilities("linkedin", phase=2),
    "x": PlatformCapabilities("x", phase=2),
    "tiktok": PlatformCapabilities("tiktok", phase=3),
    "youtube": PlatformCapabilities("youtube", phase=3),
}


def normalize_platform(value: str) -> str:
    normalized = value.strip().lower()
    normalized = PLATFORM_ALIASES.get(normalized, normalized)
    if normalized not in PLATFORM_CAPABILITIES:
        raise ValueError(f"Unsupported social platform: {value}")
    return normalized


def capability_matrix() -> list[dict]:
    return [cap.__dict__ for cap in PLATFORM_CAPABILITIES.values()]
