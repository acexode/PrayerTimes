import { Dmath } from './Dmath'

export class PrayerTimes {
  Dmath = new Dmath();

  timeNames = {
    imsak: 'Imsak',
    fajr: 'Fajr',
    sunrise: 'Sunrise',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    sunset: 'Sunset',
    maghrib: 'Maghrib',
    isha: 'Isha',
    midnight: 'Midnight'
  };
  methods = {
    MWL: {
      name: 'Muslim World League',
      params: { fajr: 18, isha: 17 }
    },
    ISNA: {
      name: 'Islamic Society of North America (ISNA)',
      params: { fajr: 15, isha: 15 }
    },
    Egypt: {
      name: 'Egyptian General Authority of Survey',
      params: { fajr: 19.5, isha: 17.5 }
    },
    Makkah: {
      name: 'Umm Al-Qura University, Makkah',
      params: { fajr: 18.5, isha: '90 min' }
    },  // fajr was 19 degrees before 1430 hijri
    Karachi: {
      name: 'University of Islamic Sciences, Karachi',
      params: { fajr: 18, isha: 18 }
    },
    Tehran: {
      name: 'Institute of Geophysics, University of Tehran',
      params: { fajr: 17.7, isha: 14, maghrib: 4.5, midnight: 'Jafari' }
    },  // isha is not explicitly specified in this method
    Jafari: {
      name: 'Shia Ithna-Ashari, Leva Institute, Qum',
      params: { fajr: 16, isha: 14, maghrib: 4, midnight: 'Jafari' }
    }
  };
  defaultParams = {
    maghrib: '0 min', midnight: 'Standard'

  };
  
  calcMethod = 'Egypt';
  setting = {
    imsak: '10 min',
    fajr: 'Standard',
    dhuhr: '0 min',
    asr: 'Standard',
    maghrib: 'Standard',
    isha: 'Standard',
    highLats: 'NightMiddle'
  };
  timeFormat = '12h';
  timeSuffixes = ['am', 'pm'];
  invalidTime = '-----';

  numIterations = 1;
  offset = {};
  lat ;
  lng ;
  elv ;
  timeZone ;
  jDate;

  defParams = this.defaultParams;
  

  constructor(method) {
    for (let i in this.methods) {
      let params = this.methods[i].params;
      for (let j in this.defParams)
        if ((typeof (params[j]) == 'undefined'))
          params[j] = this.defParams[j];
    };
    this.calcMethod = this.methods[method] ? method : this.calcMethod;
    const params = this.methods[this.calcMethod].params;
    for (let id in params)
      this.setting[id] = params[id];

    for (let i in this.timeNames)
      this.offset[i] = 0;
  }
  //----------------------- Public Functions ------------------------

  // set calculation method 
  setMethod(method) {
    if (this.methods[method]) {
      this.adjust(this.methods[method].params);
      this.calcMethod = method;
    }
  };
  // set calculating parameters
  adjust(params) {
    for (let id in params)
      this.setting[id] = params[id];
  };
  // set time offsets
  tune(timeOffsets) {
    for (let i in timeOffsets)
      this.offset[i] = timeOffsets[i];
  };
  getMethod() { return this.calcMethod; };

  // get current setting
  getSetting() { return this.setting; };

  // get current time offsets
  getOffsets() { return this.offset; };

  // get default calc parametrs
  getDefaults() { return this.methods; };

  // return prayer times for a given date
  getTimes(date, coords, timezone, dst?:any, format?:any) {
    this.lat = 1 * coords[0];
    this.lng = 1 * coords[1];
    this.elv = coords[2] ? 1 * coords[2] : 0;
    this.timeFormat = format || this.timeFormat;
    if (date.constructor === Date)
      date = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
    if (typeof (timezone) == 'undefined' || timezone == 'auto')
      timezone = this.getTimeZone(date);
    if (typeof (dst) == 'undefined' || dst == 'auto')
      dst = this.getDst(date);
    this.timeZone = 1 * timezone + (1 * dst ? 1 : 0);
    this.jDate = this.julian(date[0], date[1], date[2]) - this.lng / (15 * 24);

    return this.computeTimes();
  };
  // convert float time to the given format (see timeFormats)
  getFormattedTime(time, format, suffixes?) {
    if (isNaN(time))
      return this.invalidTime;
    if (format == 'Float') return time;
    suffixes = suffixes || this.timeSuffixes;

    time = this.Dmath.fixHour(time + 0.5 / 60);  
    // add 0.5 minutes to round
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);
    const suffix = (format == '12h') ? suffixes[hours < 12 ? 0 : 1] : '';
    const hour = (format == '24h') ? this.twoDigitsFormat(hours) : ((hours + 12 - 1) % 12 + 1);
    return hour + ':' + this.twoDigitsFormat(minutes) + (suffix ? ' ' + suffix : '');
  };

  //---------------------- Calculation Functions -----------------------

  // compute mid-day time
  midDay(time) {
    const eqt = this.sunPosition(this.jDate + time).equation;
    const noon = this.Dmath.fixHour(12 - eqt);
    return noon;
  };

  // compute the time at which sun reaches a specific angle below horizon
  sunAngleTime(angle, time, direction?) {
    const decl = this.sunPosition(this.jDate + time).declination;
    const noon = this.midDay(time);
    const r = 1 / 15
    const s = (-this.Dmath.sin(angle) - this.Dmath.sin(decl) * this.Dmath.sin(this.lat))
    const t = r * this.Dmath.arccos(s /
      (this.Dmath.cos(decl) * this.Dmath.cos(this.lat)));
      
    return noon + (direction == 'ccw' ? -t : t);
  };

  // compute asr time 
  asrTime(factor, time) {
    const decl = this.sunPosition(this.jDate + time).declination;
    const angle = -this.Dmath.arccot(factor + this.Dmath.tan(Math.abs(this.lat - decl)));
    return this.sunAngleTime(angle, time);
  };


  // compute declination angle of sun and equation of time
  // Ref: http://aa.usno.navy.mil/faq/docs/SunApprox.php
  sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = this.Dmath.fixAngle(357.529 + 0.98560028 * D);
    const q = this.Dmath.fixAngle(280.459 + 0.98564736 * D);
    const L = this.Dmath.fixAngle(q + 1.915 * this.Dmath.sin(g) + 0.020 * this.Dmath.sin(2 * g));

    const R = 1.00014 - 0.01671 * this.Dmath.cos(g) - 0.00014 * this.Dmath.cos(2 * g);
    const e = 23.439 - 0.00000036 * D;

    const RA = this.Dmath.arctan2(this.Dmath.cos(e) * this.Dmath.sin(L), this.Dmath.cos(L)) / 15;
    const eqt = q / 15 - this.Dmath.fixHour(RA);
    const decl = this.Dmath.arcsin(this.Dmath.sin(e) * this.Dmath.sin(L));

    return { declination: decl, equation: eqt };
  };

  // convert Gregorian date to Julian day
  // Ref: Astronomical Algorithms by Jean Meeus
  julian(year, month, day) {
    if (month <= 2) {
      year -= 1;
      month += 12;
    };
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);

    const JD = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
    return JD;
  };

  //---------------------- Compute Prayer Times -----------------------

  // compute prayer times at given julian date
  computePrayerTimes(times) {
    times = this.dayPortion(times);
    const params = this.setting;

    const imsak = this.sunAngleTime(this.eval(params.imsak), times.imsak, 'ccw');
    const fajr = this.sunAngleTime(this.eval(params.fajr), times.fajr, 'ccw');
    const sunrise = this.sunAngleTime(this.riseSetAngle(), times.sunrise, 'ccw');
    const dhuhr = this.midDay(times.dhuhr);
    const asr = this.asrTime(this.asrFactor(params.asr), times.asr);
    const sunset = this.sunAngleTime(this.riseSetAngle(), times.sunset);;
    const maghrib = this.sunAngleTime(this.eval(params.maghrib), times.maghrib);
    const isha = this.sunAngleTime(this.eval(params.isha), times.isha);

    return {
      imsak: imsak, fajr: fajr, sunrise: sunrise, dhuhr: dhuhr,
      asr: asr, sunset: sunset, maghrib: maghrib, isha: isha
    };
  };

  // compute prayer times 
  computeTimes() {
    // default times
    var times = {
      imsak: 5, fajr: 5, sunrise: 6, dhuhr: 12,
      asr: 13, sunset: 18, maghrib: 18, isha: 18
    };

    // main iterations
    for (let i = 1; i <= this.numIterations; i++)
      times = this.computePrayerTimes(times);

    times = this.adjustTimes(times);

    // add midnight time
    // times.midnight = (this.setting.midnight == 'Jafari') ?
    //   times.sunset + this.timeDiff(times.sunset, times.fajr) / 2 :
    //   times.sunset + this.timeDiff(times.sunset, times.sunrise) / 2;

    times = this.tuneTimes(times);
    return this.modifyFormats(times);
  };

  // adjust times 
  adjustTimes(times) {
    const params = this.setting;
    for (let i in times)
      times[i] += this.timeZone - this.lng / 15;

    if (params.highLats != 'None')
      times = this.adjustHighLats(times);

    if (this.isMin(params.imsak))
      times.imsak = times.fajr - this.eval(params.imsak) / 60;
    if (this.isMin(params.maghrib))
      times.maghrib = times.sunset + this.eval(params.maghrib) / 60;
    if (this.isMin(params.isha))
      times.isha = times.maghrib + this.eval(params.isha) / 60;
    times.dhuhr += this.eval(params.dhuhr) / 60;

    return times;
  };

  // get asr shadow factor
  asrFactor(asrParam) {
    const factor = { Standard: 1, Hanafi: 2 }[asrParam];
    return factor || this.eval(asrParam);
  };

  // return sun angle for sunset/sunrise
  riseSetAngle() {
    //var earthRad = 6371009; // in meters
    //var angle = DMath.arccos(earthRad/(earthRad+ elv));
    const angle = 0.0347 * Math.sqrt(this.elv); // an approximation
    return 0.833 + angle;
  };

  // apply offsets to the times
  tuneTimes(times) {
    for (let i in times)
      times[i] += this.offset[i] / 60;
    return times;
  };


  // convert times to given time format
  modifyFormats(times) {
    for (let i in times)
      times[i] = this.getFormattedTime(times[i], this.timeFormat);
    return times;
  };


  // adjust times for locations in higher latitudes
  adjustHighLats(times) {
    const params = this.setting;
    const nightTime = this.timeDiff(times.sunset, times.sunrise);

    times.imsak = this.adjustHLTime(times.imsak, times.sunrise, this.eval(params.imsak), nightTime, 'ccw');
    times.fajr = this.adjustHLTime(times.fajr, times.sunrise, this.eval(params.fajr), nightTime, 'ccw');
    times.isha = this.adjustHLTime(times.isha, times.sunset, this.eval(params.isha), nightTime);
    times.maghrib = this.adjustHLTime(times.maghrib, times.sunset, this.eval(params.maghrib), nightTime);

    return times;
  };

  // adjust a time for higher latitudes
  adjustHLTime(time, base, angle, night, direction?) {
    const portion = this.nightPortion(angle, night);
    const timeDiff = (direction == 'ccw') ?
      this.timeDiff(time, base) :
      this.timeDiff(base, time);
    if (isNaN(time) || timeDiff > portion)
      time = base + (direction == 'ccw' ? -portion : portion);
    return time;
  };


  // the night portion used for adjusting times in higher latitudes
  nightPortion(angle, night) {
    var method = this.setting.highLats;
    var portion = 1 / 2 
    if (method == 'AngleBased')
      portion = 1 / 60 * angle;
    if (method == 'OneSeventh')
      portion = 1 / 7;
    return portion * night;
  };

  // convert hours to day portions 
  dayPortion(times) {
    for (let i in times)
      times[i] /= 24;
    return times;
  };

  //---------------------- Time Zone Functions -----------------------

  // get local time zone
  getTimeZone(date) {
    const year = date[0];
    const t1 = this.gmtOffset([year, 0, 1]);
    const t2 = this.gmtOffset([year, 6, 1]);
    return Math.min(t1, t2);
  };


  // get daylight saving for a given date
  getDst(date) {
    return 1 * +(this.gmtOffset(date) != this.getTimeZone(date));
  };


  // GMT offset for a given date
  gmtOffset(date) {
    const localDate = new Date(date[0], date[1] - 1, date[2], 12, 0, 0, 0);
    const GMTString = localDate.toUTCString();
    const GMTDate = new Date(GMTString.substring(0, GMTString.lastIndexOf(' ') - 1));
    const hoursDiff  = (+localDate - (+GMTDate)) / (1000 * 60 * 60);
    return hoursDiff;
  };


  //---------------------- Misc Functions -----------------------

  // convert given string into a number
  eval(str ) {
    return 1 * parseInt((str + '').split(/[^0-9.+-]/)[0]);
  };


  // detect if input contains 'min'
  isMin(arg) {
    return (arg + '').indexOf('min') != -1;
  };


  // compute the difference between two times 
  timeDiff(time1, time2) {
    return this.Dmath.fixHour(time2 - time1);
  };

  twoDigitsFormat(num) {
    return (num < 10) ? '0' + num : num;
  };


}
