var Pinwheel = Class.create({
  initialize: function(select, options) {
    this.select = $(select);
    this.options = Object.extend(Object.extend({ }, Pinwheel.DefaultOptions), options || { });

    if (this.options.size) {
      this.options.height = this.options.width = this.options.size;
    }

    this.options.durationOpen = this.options.durationOpen || this.options.duration;
    this.options.durationClose = this.options.durationClose || this.options.duration;

    if (Object.isString(this.options.firstChoiceAngle)) {
      switch (this.options.firstChoiceAngle) {
        case 'up':
          this.options.firstChoiceAngle = 3 / 2 * Math.PI;
          break;

        case 'right':
          this.options.firstChoiceAngle = 0;
          break;

        case 'down':
          this.options.firstChoiceAngle = Math.PI / 2;
          break;

        case 'left':
          this.options.firstChoiceAngle = Math.PI;
          break;

        default:
          this.options.firstChoiceAngle = 0;
          break;
      }
    }

    this.pinwheel = new Element('div', { id: this.options.idPrefix + this.select.id, className: this.options.className })
      .setStyle({ height: this.options.height + 'px', width: this.options.width + 'px' })
      .makePositioned();

    var options = this.select.select('option');
    this.choices = [];
    var that = this;
    options.each(function(option, index) {
      var text = option.firstChild.nodeValue;
      var div = new Element('div', { id: that.options.choiceIdPrefix + option.value })
        .setStyle({
          height: that.options.height + 'px',
          position: 'absolute',
          width: that.options.width + 'px',
          zIndex: index
        });

      that.options.populate.call(div, option.value, text, index);

      if (index == that.select.selectedIndex) {
        that.currentChoice = div;
      }

      if (that.options.mouseover) {
        div.observe('mouseover', function(evt) {
          if (that.mouseoverEnabled) {
            that.callOptionFunctions(that.options.mouseover, that, that.eventChoice(evt.target));
          }
        })
      }

      if (that.options.mouseout) {
        div.observe('mouseout', function(evt) {
          if (that.options.mouseout && that.mouseoverEnabled) {
            that.callOptionFunctions(that.options.mouseout, that, that.eventChoice(evt.target));
          }
        });
      }

      that.pinwheel.insert(div);
      that.choices.push(div);
    });

    this.delta = 2 * Math.PI / options.size();
    if (this.options.direction == 'counterclockwise') {
      this.delta = -this.delta;
    }

    this.pinwheel.observe('click', this.toggle.bindAsEventListener(this));
    this.pinwheel.observe('pinwheel:selected', this.selected.bindAsEventListener(this));
    this.pinwheel.fire('pinwheel:selected');

    this.opened = false;
    this.mouseoverEnabled = false;
    this.select.hide().wrap(new Element('div', { id: that.options.containerIdPrefix + that.select.id, className: that.options.containerClassName })).insert(this.pinwheel);

    var dimensions = this.pinwheel.getDimensions();
    this.center = { x: dimensions.width / 2, y: dimensions.height / 2 };
  },
  callOptionFunctions: function(functions, thisArg) {
    if (!functions) return;
    var args = $A(arguments).slice(2);
    if (Object.isArray(functions)) {
      functions.each(function(func) {
        func.apply(thisArg, args);
      });
    } else {
      functions.apply(thisArg, args);
    }
  },
  enableMouseover: function() {
    this.mouseoverEnabled = true;
    return this;
  },
  disableMouseover: function() {
    this.mouseoverEnabled = false;
    return this;
  },
  eventChoice: function(target) {
    return target.tagName.toLowerCase() == 'div' ? target : target.up('div');
  },
  toggle: function(evt) {
    var that = this;
    if (this.opened) {
      // close pinwheel
      var eventChoice = this.eventChoice(evt.target);

      if (eventChoice != this.pinwheel) {
        this.currentChoice = this.eventChoice(evt.target);
      } else if (!this.options.cancelable) {
        evt.stop();
        return;
      }

      this.callOptionFunctions(this.options.beforeClose, this);

      this.disableMouseover();

      this.choices.each(function(div) {
        div.removeClassName(that.options.hoverClassName).removeClassName(that.options.chosenClassName);

        var effects = [];
        Object.keys(that.options.closeEffects).each(function(key) {
          var options = Object.extend({ chosen: true }, that.options.closeEffects[key] || { });

          options.sync = true;

          if (key == 'move' || key == 'spiral') {
            options.x = options.y = 0;
            options.mode = 'absolute';
          }

          if (div != that.currentChoice || options.chosen) {
            effects.push(new Effect[key.capitalize()](div, options));
          }
        });

        new Effect.Parallel(effects, {
          duration: that.options.durationClose
        });
      });

      this.opened = false;

      this.pinwheel.fire('pinwheel:selected');

      this.callOptionFunctions(this.options.afterClose, this);
    } else {
      // open pinwheel
      this.callOptionFunctions(this.options.beforeOpen, this);

      var angle = this.options.firstChoiceAngle;

      this.choices.each(function(div) {
        var dimensions = div.getDimensions();
        var cos = Math.cos(angle), sin = Math.sin(angle);

        var effects = [];
        Object.keys(that.options.openEffects).each(function(key) {
          var options = Object.extend({ chosen: true }, that.options.openEffects[key] || { });

          options.sync = true;

          if (key == 'move' || key == 'spiral') {
            options.x = (that.center.x + cos * that.options.distance) - dimensions.width / 2;
            options.y = (that.center.y + sin * that.options.distance) - dimensions.height / 2;
          }

          if (options.chosen || div != that.currentChoice) {
            effects.push(new Effect[key.capitalize()](div, options));
          }
        });

        new Effect.Parallel(effects, {
          afterFinish: that.enableMouseover.bind(that),
          duration: that.options.durationOpen
        });

        angle += that.delta;
      });

      this.opened = true;

      this.callOptionFunctions(this.options.afterOpen, this);
    }
  },
  selected: function() {
    var size = this.choices.size();
    var that = this;

    //this.currentChoice.setStyle({ zIndex: size });

    this.callOptionFunctions(this.options.selected, this.currentChoice);

    this.choices.each(function(div, index) {
      if (div == that.currentChoice) {
        div.setStyle({ zIndex: size });
        if (that.select.selectedIndex != index) {
          that.select.selectedIndex = index;
        }
      } else {
        div.setStyle({ zIndex: index });
      }
    });
  }
});

/**
 * "this" in the context of mouse functions refers to the pinwheel object
 */
Pinwheel.Mouse = {
  Over: {
    raise: function(choice) {
      var size = this.choices.size();
      this.choices.each(function(div, index) {
        div.setStyle({ zIndex: div == choice ? size : index });
      });
    },
    addClassName: function(className) {
      return function(choice) {
        choice.addClassName(className);
      }
    }
  },
  Out: {
    removeClassName: function(className) {
      return function(choice) {
        choice.removeClassName(className);
      }
    }
  }
}

/**
 * "this" in the context of populate functions refers to the choice div
 */
Pinwheel.Populate = {
  nothing: function(value, text) {
    return;
  },
  optionText: function(value, text) {
    $(this).update(text);
  },
  optionValue: function(value, text) {
    $(this).update(value);
  },
  image: function(lookup) {
    return function(value, text) {
      $(this).update(new Element('img', { src: lookup.get(value), alt: text, title: text }));
    };
  },
  cssSprite: function(sprite, lookup, useIndex) {
    return function(value, text, index) {
      var offsets = lookup.get(useIndex ? index : value);
      var position = offsets.x !== undefined ? (typeof offsets.x == 'number' ? offsets.x + 'px' : offsets.x) + ' ' : 'left ';
      position += offsets.y !== undefined ? (typeof offsets.y == 'number' ? offsets.y + 'px' : offsets.y) : 'top';
      $(this).setStyle({ backgroundImage: 'url(' + sprite + ')', backgroundPosition: position });
    };
  }
}

Pinwheel.DefaultOptions = {
  firstChoiceAngle: 0,
  cancelable: true,
  choiceIdPrefix: 'pw-choice-',
  className: 'pinwheel',
  containerIdPrefix: 'pw-container-',
  containerClassName: 'pw-container',
  closeEffects: { move: null },
  idPrefix: 'pw-',
  direction: 'clockwise',
  distance: 50,
  duration: 1,
  height: 50,
  openEffects: { move: null },
  populate: Pinwheel.Populate.optionText,
  width: 50
};
