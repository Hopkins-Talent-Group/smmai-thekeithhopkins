from smm.integrations.contracts import (
    PLATFORM_ALIASES,
    X_PLATFORM_KEY,
    capability_matrix,
    normalize_platform,
)


def test_platform_aliases_are_normalized():
    assert normalize_platform(" Twitter ") == "x"
    assert normalize_platform("linkedin") == "linkedin"
    assert PLATFORM_ALIASES["twitter"] == X_PLATFORM_KEY


def test_phase_two_platforms_are_present():
    platforms = {item["platform"] for item in capability_matrix()}
    assert {"meta", "facebook", "instagram", "linkedin", "x", "tiktok", "youtube"} <= platforms


def test_adapter_factory_uses_canonical_x_key():
    from smm.integrations.adapters import AdapterFactory, TwitterAdapter

    for spelling in ("x", "twitter", " Twitter "):
        adapter = AdapterFactory.get_adapter(spelling)
        assert isinstance(adapter, TwitterAdapter)
        assert adapter.platform == "x"

    linkedin = AdapterFactory.get_adapter("linkedin")
    assert linkedin.platform == "linkedin"


def test_x_adapter_emits_canonical_platform():
    from smm.domain.models import ContentDraft
    from smm.integrations.adapters import TwitterAdapter

    draft = ContentDraft("1", "topic", "x", "hello")
    result = TwitterAdapter().publish(draft, dry_run=True)
    assert result.platform == "x"
    assert result.dry_run is True
