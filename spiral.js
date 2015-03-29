Effect.Spiral = Class.create(Effect.Base, {
  initialize: function(element) {
    this.element = $(element);
    if (!this.element) throw(Effect._elementDoesNotExistError);
    var options = Object.extend({
      arc: Math.PI / 2,
      direction: 'clockwise',
      x: 0,
      y: 0,
      mode: 'relative'
    }, arguments[1] || { });
    this.start(options);
  },
  setup: function() {
    this.element.makePositioned();
    this.originalLeft = parseFloat(this.element.getStyle('left') || '0');
    this.originalTop = parseFloat(this.element.getStyle('top') || '0');
    if (this.options.mode == 'absolute') {
      this.options.x = this.options.x - this.originalLeft;
      this.options.y = this.options.y - this.originalTop;
	  this.hypotenuse = Math.sqrt(Math.pow(this.options.x, 2) + Math.pow(this.options.y, 2));
    } else {
	  this.hypotenuse = Math.sqrt(Math.pow(this.options.x - this.originalLeft, 2) + Math.pow(this.options.y - this.originalTop, 2));
	}
    this.finalAngle = Math.acos(this.options.x / this.hypotenuse);
    this.finalAngle = this.options.y < 0 ? -this.finalAngle : this.finalAngle;
    this.startAngle = this.options.direction == 'clockwise' ? this.finalAngle - this.options.arc : this.finalAngle + this.options.arc;
  },
  update: function(position) {
    var angle = this.options.direction == 'clockwise' ? this.startAngle + position * this.options.arc : this.startAngle - position * this.options.arc;
    this.element.setStyle({
      left: (Math.cos(angle) * position * this.hypotenuse + this.originalLeft).round() + 'px',
      top: (Math.sin(angle) * position * this.hypotenuse + this.originalTop).round() + 'px'
    });
  }
});

Number.prototype.toRadians = function() {
  return this * Math.PI / 180;
}
