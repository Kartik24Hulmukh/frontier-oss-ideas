/** Latest-wins request lifecycle. Generation guards work even if transport ignores abort. */
export class LatestRequest {
  private generation = 0
  private controller: AbortController | null = null
  private timer: ReturnType<typeof setTimeout> | null = null

  cancel() {
    this.generation++
    this.controller?.abort()
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    this.controller = null
  }

  begin(timeoutMs = 60_000) {
    this.cancel()
    const generation = this.generation
    const controller = new AbortController()
    this.controller = controller
    this.timer = setTimeout(() => controller.abort(new Error('Request timed out. Please try again.')), timeoutMs)
    return {
      signal: controller.signal,
      isCurrent: () => generation === this.generation,
      canCommit: () => generation === this.generation && !controller.signal.aborted,
      finish: () => {
        if (generation !== this.generation) return
        if (this.timer !== null) clearTimeout(this.timer)
        this.timer = null
        this.controller = null
      },
    }
  }
}
