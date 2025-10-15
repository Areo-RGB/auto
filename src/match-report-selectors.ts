
/**
 * Selectors for the DFBnet match report page.
 */
export const matchReportSelectors = {
  /**
   * The privacy dialog that appears on the page.
   */
  privacyDialog: 'dialog[aria-label="Privatsphäre-Informationen"]',

  /**
   * The "Accept all" button in the privacy dialog.
   */
  acceptAllButton: 'button:has-text("Akzeptiere alle")',

  /**
   * The season of the match.
   * Example: "25/26"
   */
  saison: 'div.row:has(> div.col-sm-3:has-text("Saison")) div.col-sm-9',

  /**
   * The team category.
   * Example: "D-Junioren"
   */
  mannschaftsart: 'div.row:has(> div.col-sm-3:has-text("Mannschaftsart")) div.col-sm-9',

  /**
   * The league.
   * Example: "Kreisklasse C"
   */
  spielklasse: 'div.row:has(> div.col-sm-3:has-text("Spielklasse")) div.col-sm-9',

  /**
   * The region.
   * Example: "Kreis Berlin"
   */
  gebiet: 'div.row:has(> div.col-sm-3:has-text("Gebiet")) div.col-sm-9',

  /**
   * The competition.
   * Example: "Meisterschaft"
   */
  wettkampf: 'div.row:has(> div.col-sm-3:has-text("Wettkampf")) div.col-sm-9',

  /**
   * The division.
   * Example: "unt. D-Junioren Kreisklasse C St.3 Hin"
   */
  staffel: 'div.row:has(> div.col-sm-3:has-text("Staffel")) div.col-sm-9',

  /**
   * The round.
   * Example: "Runde 1"
   */
  runde: 'div.row:has(> div.col-sm-3:has-text("Runde")) div.col-sm-9',

  /**
   * The match ID.
   * Example: "665272022"
   */
  spielkennung: 'div.row:has(> div.col-sm-3:has-text("Spielkennung")) div.col-sm-9',

  /**
   * The match day.
   * Example: "4"
   */
  spieltag: 'div.row:has(> div.col-sm-3:has-text("Spieltag")) div.col-sm-9',

  /**
   * The match pairing.
   * Example: "SC Berliner Amateure IV - FC Hertha 03 V"
   */
  begegnung: 'div.row:has(> div.col-sm-3:has-text("Begegnung")) div.col-sm-9',

  /**
   * The match date.
   * Example: "Do., 16.10.25"
   */
  spieldatum: 'div.row:has(> div.col-sm-3:has-text("Spieldatum")) div.col-sm-9',

  /**
   * The kick-off time.
   * Example: "18:00"
   */
  anstoss: 'div.row:has(> div.col-sm-3:has-text("Anstoß")) div.col-sm-9',

  /**
   * The end time of the match.
   * Example: "19:15"
   */
  spielende: 'div.row:has(> div.col-sm-3:has-text("Spielende")) div.col-sm-9',

  /**
   * The duration of the match.
   * Example: "60"
   */
  spieldauer: 'div.row:has(> div.col-sm-3:has-text("Spieldauer")) div.col-sm-9',

  /**
   * The status of the match report.
   * Example: "In Planung"
   */
  spielberichtsstatus: 'div.row:has(> div.col-sm-3:has-text("Spielberichtsstatus")) div.col-sm-9',

  /**
   * The checkbox to not publish the referee.
   */
  schiedsrichterNichtVeroeffentlichenCheckbox: 'input[type="checkbox"][label="Schiedsrichter nicht veröffentlichen"]',

  /**
   * The time from which the referee is scheduled.
   * Example: "Angesetzt ab 18:00"
   */
  angesetztAb: 'div.row:has(> div.col-sm-12:has-text("Angesetzt ab"))',

  /**
   * The name of the scheduled referee.
   * Example: "Jumaa, Saleh"
   */
  angesetzterSchiedsrichterName: 'div.row:has(> div.col-sm-12:has-text("Angesetzt ab")) + div.row div.col-sm-9',

  /**
   * The club of the scheduled referee.
   * Example: "BFC Tur Abdin"
   */
  angesetzterSchiedsrichterVerein: 'div.row:has(> div.col-sm-12:has-text("Angesetzt ab")) + div.row + div.row div.col-sm-9',

  /**
   * The phone number of the scheduled referee.
   * Example: "0177 7845382"
   */
  angesetzterSchiedsrichterTelefon: 'div.row:has(> div.col-sm-12:has-text("Angesetzt ab")) + div.row + div.row + div.row div.col-sm-9',

  /**
   * The "Not scheduled" text.
   */
  nichtAngesetzt: 'div.row:has(> div.col-sm-12:has-text("Nicht angesetzt"))',

  /**
   * The name of the unscheduled referee.
   * Example: "Reinhold, Dirk"
   */
  nichtAngesetzterSchiedsrichterName: 'div.row:has(> div.col-sm-12:has-text("Nicht angesetzt")) + div.row div.col-sm-9',

  /**
   * The club of the unscheduled referee.
   * Example: "Verein: keine Angabe"
   */
  nichtAngesetzterSchiedsrichterVerein: 'div.row:has(> div.col-sm-12:has-text("Nicht angesetzt")) + div.row + div.row div.col-sm-9',

  /**
   * The phone number of the unscheduled referee.
   * Example: "Telefon: keine Angabe"
   */
  nichtAngesetzterSchiedsrichterTelefon: 'div.row:has(> div.col-sm-12:has-text("Nicht angesetzt")) + div.row + div.row + div.row div.col-sm-9',

  /**
   * The "Add referee" button.
   */
  schiedsrichterHinzufuegenButton: 'button:has-text("SCHIEDSRICHTER HINZUFÜGEN")',

  /**
   * The "Save" button.
   */
  speichernButton: 'button:has-text("SPEICHERN")',

  /**
   * The location of the match.
   * Example: "Körtestraße KR"
   */
  spielstaette: 'div.row:has(> div.col-sm-3:has-text("Spielstätte")) div.col-sm-9',

  /**
   * The type of pitch.
   * Example: "Kunstrasenplatz"
   */
  platzart: 'div.row:has(> div.col-sm-3:has-text("Platzart")) div.col-sm-9',

  /**
   * The link to the imprint.
   */
  impressumLink: 'a:has-text("Impressum")',

  /**
   * The button to open the privacy settings.
   */
  datenschutzeinstellungenButton: 'button:has-text("Öffnen Datenschutzeinstellungen")',
};
