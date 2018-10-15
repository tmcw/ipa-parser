const SegmentHelper = require("./segment-helper");
const Articulation = require("./articulation");
const Place = require("./place");

module.exports = class ConsonantBuilder {
  constructor(consonant) {
    this.segmentHelper = SegmentHelper.createConsonant();
    this.state = "single-char";
    this.articulations = [new Articulation(consonant)];
    this.ejective = false;
  }

  addDiacritic(diacritic) {
    switch (diacritic.type) {
      case "tone": this.segmentHelper.addTone(diacritic.label); break;
      case "quantity": this.segmentHelper.updateQuantity(diacritic.label); break;
      case "syllabicity": this.segmentHelper.updateSyllabicity(diacritic.label); break;
      case "phonation": this._getCurrentArticulation().updatePhonation(diacritic.label); break;
      case "articulation": this._getCurrentArticulation().updateArticulation(diacritic.label); break;
      case "ejective": this.ejective = true; break;
      case "release": /*TODO*/; break;
      case "co-articulation": /*TODO*/; break;
      default: // InternErr
    }
  }

  _getCurrentArticulation() {
    return this.articulations[this.articulations.length - 1];
  }

  addTieBar() {
    if (this.state === "single-char") {
      this.state = "expecting";
    } else {
      // SyntErr
    }
  }

  isExpectingConsonant() {
    return this.state === "expecting";
  }

  addConsonant(second) {
    if (!this.isExpectingConsonant()) {
      // SyntErr
      this.state = "error";
      return;
    }
    this.articulations.push(new Articulation(second));
    this.state = "double-char";
  }

  end() {
    if (this.isExpectingConsonant()) {
      // SyntErr
    }

    let data = this._resolveArticulations();
    data.ejective = this.ejective;
    data.places = Place.orderPlaces(data.places);

    return this.segmentHelper.buildWithValues(data);
  }

  _resolveArticulations() {
    let first = this.articulations[0];

    if (this.articulations.length == 1) {
      // If there is only one articulation
      return {
        "voicing": first.voicingHelper.build(),
        "manner": first.manner,
        "places": first.places,
        "lateral": first.lateral
      }
    }

    // If two articulations
    let second = this.articulations[1];
    if (first.manner === "plosive" && second.manner === "fricative") {
      return this._resolveAffricate(first, second);
    } else if (first.manner === second.manner) {
      return this._resolveCoarticulation(first, second, first.manner);
    } else if (first.manner === "plosive" && second.manner === "implosive") {
      return this._resolveCoarticulation(first, second, "implosive");
    } else {
      return "error invalid articulations manner " + first.manner + " + " + second.manner;
    }
  }

  _resolveAffricate(first, second) {
    if (first.places.length != 1 && second.places.length != 1) {
      return "error affricate with more than one place " + first.places + " + " + second.places;
    }

    let firstPlace = first.places[0];
    let secondPlace = second.places[0];
    let firstVoiced = first.voicingHelper.voiced;
    let secondVoiced = second.voicingHelper.voiced;

    if (firstVoiced == secondVoiced) {
      let affricatePlace = this._computeAffricatePlace(firstPlace, secondPlace);
      if (affricatePlace == "error") {
        return "error invalid affricate place " + firstPlace + " + " + secondPlace;
      }

      return {
        "voicing": first.voicingHelper.buildWith(second.voicingHelper),
        "manner": "affricate",
        "places": affricatePlace,
        "lateral": second.lateral,
      }
    }

    // Ad-hoc case for 'ʡ͡ʕ'
    if (firstPlace == "epiglottal" && secondPlace == "pharyngeal"
      && firstVoiced == false) {
      return {
        "voicing": second.voicingHelper.build(),
        "manner": "affricate",
        "places": ["pharyngeal"],
        "lateral": second.lateral,
      }
    }

    // Invalid voicing combination
    return "error invalid voicing for affricate";
  }

  _computeAffricatePlace(firstPlace, secondPlace) {
    if (firstPlace == "alveolar") {
      return (Place.isCoronal(secondPlace) ? [secondPlace] : "error");
    } else if (firstPlace == "epiglottal") {
      return (secondPlace == "pharyngeal" ? [secondPlace] : "error");
    } else {
      return (secondPlace == firstPlace ? [secondPlace] : "error");
    }
  }

  _resolveCoarticulation(first, second, manner) {
    let lateral = first.lateral || second.lateral;
    let places = first.places.concat(second.places);

    let firstVoiced = first.voicingHelper.voiced;
    let secondVoiced = second.voicingHelper.voiced;

    if (firstVoiced != secondVoiced) {
      return "error invalid voicing for coarticulation";
    }

    return {
      "manner": manner,
      "voicing": first.voicingHelper.buildWith(second.voicingHelper),
      "lateral": lateral,
      "places": places
    };
  }
}