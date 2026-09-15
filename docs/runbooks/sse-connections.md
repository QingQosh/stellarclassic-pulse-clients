# SSE Connections Runbook

## Symptom
The number of active Server-Sent Events (SSE) connections is unusually high or growing unbounded. The `stellarclassic_pulse_sse_active_connections` metric is increasing or exceeds expected levels, potentially causing memory exhaustion or resource starvation.

## Likely Causes
1. **Clients not disconnecting**: SSE clients are not properly closing connections
2. **Memory leak in SSE handler**: The SSE broadcast channel is accumulating messages
3. **Slow client consumption**: Clients are connected but not consuming messages fast enough
4. **Reverse proxy buffering**: A reverse proxy is buffering SSE messages instead of streaming them
5. **Network issues**: Clients are experiencing network problems but not disconnecting

## Investigation Steps

### 1. Check current SSE connection count
```bash
promtool query instant 'stellarclassic_pulse_sse_active_connections'
```

### 2. Monitor connection growth over time
```bash
# Check if connections are growing linearly
promtool query range 'stellarclassic_pulse_sse_active_connections' --start=1h --step=1m
```

### 3. Check application logs for SSE errors
```bash
kubectl logs -l app=stellarclassic-pulse -c stellarclassic-pulse --tail=200 | grep -i "sse\|stream\|broadcast"
```

### 4. Check pod resource usage
```bash
kubectl top pod -l app=stellarclassic-pulse
kubectl describe pod -l app=stellarclassic-pulse | grep -A 5 "Memory\|CPU"
```

### 5. Inspect active connections from the pod
```bash
kubectl exec -it <pod-name> -- bash
# Check open file descriptors
lsof -p $$ | grep socket | wc -l
```

## Resolution Steps

### Immediate actions
1. **Restart the indexer pod** to clear accumulated connections:
   ```bash
   kubectl rollout restart deployment/stellarclassic-pulse
   ```

2. **Monitor memory usage** after restart:
   ```bash
   kubectl top pod -l app=stellarclassic-pulse --watch
   ```

### If connections are not disconnecting
- Review client-side code to ensure proper `EventSource` cleanup
- Check for JavaScript errors preventing `close()` calls
- Implement client-side reconnection logic with exponential backoff

### If there's a memory leak
- Review the SSE broadcast channel implementation
- Check for unbounded message queues
- Implement message retention limits
- Add metrics for broadcast channel size

### If reverse proxy is buffering
- Configure the reverse proxy to stream responses immediately
- For nginx: add `proxy_buffering off;`
- For Apache: add `SetEnv proxy-sendchunked 1`
- For Caddy: add `flush_interval -1`

### If clients are slow
- Implement backpressure handling in the SSE handler
- Drop slow clients after a timeout
- Implement client-side message batching

## Prevention
- Monitor SSE connection count continuously
- Set up alerts for abnormal connection growth
- Implement connection timeouts (e.g., 30 minutes of inactivity)
- Test SSE client behavior under network failures
- Load test SSE endpoints with many concurrent clients
- Implement graceful shutdown that closes all SSE connections
