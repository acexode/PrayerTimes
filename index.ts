import { PrayerTimes } from './prayer'
import { Dmath } from './Dmath'
const prayerTimes = new PrayerTimes('MWL');

const time = prayerTimes.getTimes(new Date(), [9.072264, 7.491302], 'auto','auto', '24h');
const dmath = new Dmath();
document.write('Sunrise : '+ prayerTimes.getMethod());
console.log(time);