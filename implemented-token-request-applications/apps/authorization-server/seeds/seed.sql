PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

DELETE FROM "RedirectUri";
DELETE FROM "Scope";
DELETE FROM "Client";
DELETE FROM "User";

INSERT INTO "User" ("id", "username", "password")
VALUES ('user-001', 'testuser', 'password123');

INSERT INTO "Client" ("clientId", "clientSecret")
VALUES ('cli_seed_1', 'secret_12345');

INSERT INTO "RedirectUri" ("id", "uri", "clientId")
VALUES ('ruri_seed_1', 'http://localhost:8788/callback', 'cli_seed_1');

INSERT INTO "Scope" ("id", "name", "clientId") VALUES
	('scp_read_profile', 'read:profile', 'cli_seed_1');

COMMIT;
