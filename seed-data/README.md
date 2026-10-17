# Seed data

Drop a JSON dump in this directory, then:

```bash
docker compose --profile seed run --rm seed /data/your-dump.json --profile-id <profile-uuid>
```

`scripts/seed.py --help` lists the accepted layouts (app-shaped items, a
DynamoDB `scan` result, a newline-delimited S3 table export). `--profile-id`
rewrites each item's owner, which is what an export from AWS needs, since
`user_id` there was a Cognito username rather than a local profile id.

Files in here are gitignored apart from this README, so real workout data does
not end up committed.
