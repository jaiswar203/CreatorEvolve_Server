function secondsToHms(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [hours, minutes, secs].map((v) => (v < 10 ? '0' + v : v)).join(':');
}

export { secondsToHms };
