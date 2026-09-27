"""SoloLink backend test suite - auth, profile, links, public, ownership."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://link-bio-builder-4.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

SUFFIX = uuid.uuid4().hex[:8]
USER_A = {"email": f"test_a_{SUFFIX}@example.com", "password": "password123", "username": f"testa{SUFFIX}", "display_name": "User A"}
USER_B = {"email": f"test_b_{SUFFIX}@example.com", "password": "password123", "username": f"testb{SUFFIX}", "display_name": "User B"}


@pytest.fixture(scope="session")
def session():
    return requests.Session()


@pytest.fixture(scope="session")
def tokens(session):
    tok = {}
    for u in (USER_A, USER_B):
        r = session.post(f"{API}/auth/register", json=u)
        assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
        data = r.json()
        assert "token" in data and "user" in data
        assert data["user"]["username"] == u["username"]
        tok[u["email"]] = data["token"]
    return tok


def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ----- Auth -----
class TestAuth:
    def test_register_and_login(self, session, tokens):
        r = session.post(f"{API}/auth/login", json={"email": USER_A["email"], "password": USER_A["password"]})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_login_bad_password(self, session, tokens):
        r = session.post(f"{API}/auth/login", json={"email": USER_A["email"], "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, session, tokens):
        r = session.get(f"{API}/auth/me", headers=auth(tokens[USER_A["email"]]))
        assert r.status_code == 200
        assert r.json()["user"]["email"] == USER_A["email"]

    def test_me_unauth(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_check_username_available(self, session):
        r = session.get(f"{API}/auth/check-username", params={"username": f"avail{SUFFIX}new"})
        assert r.status_code == 200
        assert r.json() == {"available": True, "valid": True}

    def test_check_username_taken(self, session, tokens):
        r = session.get(f"{API}/auth/check-username", params={"username": USER_A["username"]})
        assert r.status_code == 200
        assert r.json()["available"] is False

    def test_check_username_case_insensitive(self, session, tokens):
        r = session.get(f"{API}/auth/check-username", params={"username": USER_A["username"].upper()})
        assert r.json()["available"] is False

    def test_register_duplicate_username(self, session, tokens):
        r = session.post(f"{API}/auth/register", json={
            "email": f"dup{SUFFIX}@example.com", "password": "password123",
            "username": USER_A["username"].upper()
        })
        assert r.status_code == 400

    def test_register_reserved_username(self, session):
        r = session.post(f"{API}/auth/register", json={
            "email": f"res{SUFFIX}@example.com", "password": "password123", "username": "admin"
        })
        assert r.status_code == 400


# ----- Profile -----
class TestProfile:
    def test_update_profile(self, session, tokens):
        r = session.put(f"{API}/profile",
                        json={"display_name": "User A New", "bio": "hello world"},
                        headers=auth(tokens[USER_A["email"]]))
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["display_name"] == "User A New"
        assert u["bio"] == "hello world"
        # verify persistence
        r2 = session.get(f"{API}/auth/me", headers=auth(tokens[USER_A["email"]]))
        assert r2.json()["user"]["bio"] == "hello world"

    def test_bio_too_long(self, session, tokens):
        r = session.put(f"{API}/profile", json={"bio": "x" * 200},
                        headers=auth(tokens[USER_A["email"]]))
        assert r.status_code == 400


# ----- Links -----
class TestLinks:
    def test_add_valid_link(self, session, tokens):
        r = session.post(f"{API}/links", json={"title": "My Site", "url": "https://example.com"},
                         headers=auth(tokens[USER_A["email"]]))
        assert r.status_code == 200
        link = r.json()["link"]
        assert link["title"] == "My Site"
        assert link["url"].startswith("https://")

    def test_reject_invalid_url(self, session, tokens):
        r = session.post(f"{API}/links", json={"title": "Bad", "url": "not a url"},
                         headers=auth(tokens[USER_A["email"]]))
        assert r.status_code == 400

    def test_reject_empty_title(self, session, tokens):
        r = session.post(f"{API}/links", json={"title": "   ", "url": "https://example.com"},
                         headers=auth(tokens[USER_A["email"]]))
        assert r.status_code == 400

    def test_get_links(self, session, tokens):
        r = session.get(f"{API}/links", headers=auth(tokens[USER_A["email"]]))
        assert r.status_code == 200
        assert isinstance(r.json()["links"], list)

    def test_reorder(self, session, tokens):
        # ensure 2 links
        session.post(f"{API}/links", json={"title": "Two", "url": "https://two.com"},
                     headers=auth(tokens[USER_A["email"]]))
        r = session.get(f"{API}/links", headers=auth(tokens[USER_A["email"]]))
        ids = [l["id"] for l in r.json()["links"]]
        assert len(ids) >= 2
        reversed_ids = list(reversed(ids))
        r2 = session.put(f"{API}/links/reorder/all", json={"ordered_ids": reversed_ids},
                         headers=auth(tokens[USER_A["email"]]))
        assert r2.status_code == 200
        got = [l["id"] for l in r2.json()["links"]]
        assert got == reversed_ids

    def test_delete_link(self, session, tokens):
        r = session.post(f"{API}/links", json={"title": "Del", "url": "https://del.com"},
                         headers=auth(tokens[USER_A["email"]]))
        lid = r.json()["link"]["id"]
        r2 = session.delete(f"{API}/links/{lid}", headers=auth(tokens[USER_A["email"]]))
        assert r2.status_code == 200
        # verify gone
        r3 = session.get(f"{API}/links", headers=auth(tokens[USER_A["email"]]))
        assert lid not in [l["id"] for l in r3.json()["links"]]


# ----- Ownership -----
class TestOwnership:
    def test_user_b_cannot_edit_or_delete_user_a_link(self, session, tokens):
        # A creates link
        r = session.post(f"{API}/links", json={"title": "Owned", "url": "https://a.com"},
                         headers=auth(tokens[USER_A["email"]]))
        lid = r.json()["link"]["id"]
        # B tries edit
        rE = session.put(f"{API}/links/{lid}", json={"title": "Hacked"},
                         headers=auth(tokens[USER_B["email"]]))
        assert rE.status_code == 403
        # B tries delete
        rD = session.delete(f"{API}/links/{lid}", headers=auth(tokens[USER_B["email"]]))
        assert rD.status_code == 403
        # B's links endpoint doesn't see A's link
        rG = session.get(f"{API}/links", headers=auth(tokens[USER_B["email"]]))
        assert lid not in [l["id"] for l in rG.json()["links"]]


# ----- Public -----
class TestPublic:
    def test_public_profile_ok(self, session, tokens):
        r = session.get(f"{API}/public/{USER_A['username']}")
        assert r.status_code == 200
        data = r.json()
        assert data["profile"]["username"] == USER_A["username"]
        assert isinstance(data["links"], list)

    def test_public_profile_case_insensitive(self, session, tokens):
        r = session.get(f"{API}/public/{USER_A['username'].upper()}")
        assert r.status_code == 200

    def test_public_not_found(self, session):
        r = session.get(f"{API}/public/nonexistentuser_{SUFFIX}")
        assert r.status_code == 404
