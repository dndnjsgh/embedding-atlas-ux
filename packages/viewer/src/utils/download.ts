// Copyright (c) 2025 Apple Inc. Licensed under MIT License.

export function downloadBuffer(arrayBuffer: ArrayBuffer | Uint8Array<ArrayBuffer>, fileName: string) {
  let a = document.createElement("a");
  const url = URL.createObjectURL(new Blob([arrayBuffer], { type: "application/octet-stream" }));
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
