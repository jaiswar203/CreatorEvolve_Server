export const isValidTimeHMSFormat = (time: string) => {
    const timeFormat = /^(\d+)(?::(\d{1,2}))?(?::(\d{1,2}))?$/;
    return timeFormat.test(time.trim());
};

// conversion.js
export const hmsToSeconds = (time: string) => {
    time = time.trim();

    if (!isValidTimeHMSFormat(time)) {
      throw new Error('Invalid time format');
    }
  
    const parts = time.split(':').map(Number).reverse();
    let seconds = 0;
  
    if (parts.length >= 1) {
      // SS format
      seconds += parts[0];
    }
    if (parts.length >= 2) {
      // MM:SS format
      seconds += parts[1] * 60;
    }
    if (parts.length >= 3) {
      // HH:MM:SS format
      seconds += parts[2] * 3600;
    }
  
    return seconds;
};
