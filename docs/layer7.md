# Layer 7

The Gateway classifies requests by endpoint policy and request window, then applies allow, limit, delay, queue, drop or alert decisions. Heavy requests use a bounded concurrency queue with maximum size, wait timeout, average/maximum wait metrics, release-on-finish and reset-safe cancellation.
