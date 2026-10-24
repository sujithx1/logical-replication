# Roadmap

Planned work for the logical replication dashboard. Items are in rough priority order; see the README's
"Coming Soon" section for the user-facing summary.

## 1. Bi-directional replication

Today a setup is one-way: primary publishes, replica subscribes. The goal is to let writes on the replica flow back
to the primary as well, so both sides accept writes and stay in sync.

- Create a publication on the replica and a subscription on the primary for the same table set.
- Guard against ping-pong loops (PostgreSQL 16+ `origin = none` on subscriptions).
- Surface conflicts in the status view instead of silently stalling the apply worker.

## 2. More than two replicas

Allow one primary to fan out to N replicas from a single setup.

- Setup form accepts a list of replica connections.
- Status page shows a per-replica health row (slot, WAL lag, apply worker state).
- Teardown drops every subscription before removing the publication.

## 3. Replication log stream in the UI

After a replication is created successfully, hand the user a random access code. The UI gets an input for that
code and streams the matching replication log so the user can watch decoding and apply activity live.

- Code is stored with the replication record and can be rotated.
- Logs are read from the database side (`pg_stat_subscription`, server log tail) and pushed over SSE/WebSocket.
- Access is scoped to the owning user; admins see masked connection details only.

<details>
<summary>Original notes (kept verbatim)</summary>

```text
# write option both in primary and replica    like if create any data in replica then also create in primary
# more than 2 replicas





# UI_logs_replication
 im planing to do one thing  like  after success create  replication ->  i will give one random_generator to user  , 
 in ui i will show one input and get log so user that code  
```

</details>
