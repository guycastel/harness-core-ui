export const scrollToOverrideSpecRowByIndex = (specRowIndex: number): void => {
  const rowElement = document.querySelector(`#override-spec-detail-row-${specRowIndex}`)
  if (!rowElement) return

  // Scroll to first known error row into view
  setTimeout(() => {
    rowElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, 100)
}
