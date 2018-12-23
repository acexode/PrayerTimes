export class Dmath {

  dtr = (d) => (d * Math.PI) / 180.0;
  rtd = (r) => (r * 180.0) / Math.PI;
  sin = (d) => Math.sin(this.dtr(d));
  cos = (d) => Math.cos(this.dtr(d));
  tan = (d) => Math.tan(this.dtr(d));
  arcsin = (d) => this.rtd(Math.asin(d));
  arccos = (d) => this.rtd(Math.acos(d));
  arctan = (d) => this.rtd(Math.atan(d));

  arccot = (x) => this.rtd(Math.atan(1 / x));
  arctan2 = (y, x) => this.rtd(Math.atan2(y, x));
  
  fixAngle = (a) => this.fix(a, 360);
  fixHour = (a) => this.fix(a, 24);
  fix = (a, b) => {
    a = a - b * (Math.floor(a / b));
    return (a < 0) ? a + b : a;
  };
  



}
