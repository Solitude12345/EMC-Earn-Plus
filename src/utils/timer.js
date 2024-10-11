import dayjs from 'dayjs';

class Timer {
  constructor() {
    this.startTime = null;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.callback = null;
  }

  start(callback) {
    this.startTime = dayjs();
    this.callback = callback;
    this.updateTime();
    this.timerInterval = setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  stop() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  }

  reset() {
    this.stop();
    this.elapsedTime = 0;
    this.startTime = null;
    if (this.callback) {
      this.callback(this.formatTime(0));
    }
  }

  updateTime() {
    const now = dayjs();
    this.elapsedTime = now.diff(this.startTime, 'second');
    if (this.callback) {
      this.callback(this.formatTime(this.elapsedTime));
    }
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}.${String(minutes).padStart(2, '0')}.${String(secs).padStart(2, '0')}`;
  }
}

export default Timer;
