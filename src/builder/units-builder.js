const VowelBuilder = require("./vowel-builder");
const ConsonantBuilder = require("./consonant-builder");
const ToneLettersBuilder = require("./tone-letters-builder");

const IpaInternalError = require("../error/ipa-internal-error");
const IpaSyntaxtError = require("../error/ipa-syntax-error");

module.exports = class UnitsBuilder {
  constructor() {
    this.state = "init";
    this.units = [];
    this.currentBuilder = null;
  }

  add(data) {
    switch (data.type) {
      case "vowel": {
        this._endCurrentBuilder();
        this.currentBuilder = new VowelBuilder(data);
        this.state = "vowel";
      }; break;

      case "consonant": {
        if (this.state == "consonant" && this.currentBuilder.isExpectingConsonant()) {
          this.currentBuilder.addConsonant(data);
        } else {
          this._endCurrentBuilder();
          this.currentBuilder = new ConsonantBuilder(data);
          this.state = "consonant";
        }
      }; break;

      case "tone-letter": {
        if (this.state == "tone-letter") {
          this.currentBuilder.addTone(data);
        } else {
          this._endCurrentBuilder();
          this.currentBuilder = new ToneLettersBuilder(data);
          this.state = "tone-letter";
        }
      }; break;

      case "diacritic": {
        if (this.state == "vowel" || this.state == "consonant") {
          this.currentBuilder.addDiacritic(data.diacritic);
        } else {
          throw new IpaSyntaxtError("Diacritic without vowel or consonant");
        }
      }; break;

      case "supra": {
        this._endCurrentBuilder();
        this.units.push(this._buildSupra(data));
        this.state = "init";
      }; break;

      case "tie-bar": {
        if (this.state != "consonant") {
          throw new IpaSyntaxtError("Tie-Bar without consonant");
        }
        this.currentBuilder.addTieBar();
      }; break;

      default: throw new IpaInternalError("Unsupported data type : '" + data.type + "'");
    }
  }

  spacing() {
    this._endCurrentBuilder();
    this.state = "init";
  }

  end() {
    this._endCurrentBuilder();
    return this.units;
  }

  _endCurrentBuilder() {
    if (this.currentBuilder != null) {
      this.units = this.units.concat(this.currentBuilder.end());
      this.currentBuilder = null;
    }
  }

  _buildSupra(data) {
    return { "segment": false, "category": data.category, "value": data.value };
  }
}