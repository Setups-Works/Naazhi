/**
 * Countries (ISO 3166-1 alpha-2) and the one rule that turns a country into how a person pays. Shared by the web app, the phone app and
 * the server, so a price, a button and a payment provider can never disagree about it.
 *
 * India pays in rupees through Razorpay; every other country pays in US dollars through Stripe. Nothing else in the codebase should
 * compare a country to "IN": call `billingRegion()`.
 */

export type Currency = "inr" | "usd";
export type PaymentProvider = "razorpay" | "stripe";
export type BillingRegion = { currency: Currency; provider: PaymentProvider };

/** The country whose people pay in rupees through Razorpay. */
export const HOME_COUNTRY = "IN";

export const REGIONS: Record<"in" | "intl", BillingRegion> = {
  in: { currency: "inr", provider: "razorpay" },
  intl: { currency: "usd", provider: "stripe" },
};

/** [code, name]. Every ISO 3166-1 country and territory a person might live in, sorted by name. */
export const COUNTRIES: readonly (readonly [string, string])[] = [
  ["AF", "Afghanistan"], ["AX", "Åland Islands"], ["AL", "Albania"], ["DZ", "Algeria"], ["AS", "American Samoa"], ["AD", "Andorra"], ["AO", "Angola"],
  ["AI", "Anguilla"], ["AQ", "Antarctica"], ["AG", "Antigua and Barbuda"], ["AR", "Argentina"], ["AM", "Armenia"], ["AW", "Aruba"], ["AU", "Australia"],
  ["AT", "Austria"], ["AZ", "Azerbaijan"], ["BS", "Bahamas"], ["BH", "Bahrain"], ["BD", "Bangladesh"], ["BB", "Barbados"], ["BY", "Belarus"],
  ["BE", "Belgium"], ["BZ", "Belize"], ["BJ", "Benin"], ["BM", "Bermuda"], ["BT", "Bhutan"], ["BO", "Bolivia"], ["BQ", "Bonaire, Sint Eustatius and Saba"],
  ["BA", "Bosnia and Herzegovina"], ["BW", "Botswana"], ["BV", "Bouvet Island"], ["BR", "Brazil"], ["IO", "British Indian Ocean Territory"],
  ["BN", "Brunei"], ["BG", "Bulgaria"], ["BF", "Burkina Faso"], ["BI", "Burundi"], ["CV", "Cabo Verde"], ["KH", "Cambodia"], ["CM", "Cameroon"],
  ["CA", "Canada"], ["KY", "Cayman Islands"], ["CF", "Central African Republic"], ["TD", "Chad"], ["CL", "Chile"], ["CN", "China"],
  ["CX", "Christmas Island"], ["CC", "Cocos (Keeling) Islands"], ["CO", "Colombia"], ["KM", "Comoros"], ["CG", "Congo"], ["CD", "Congo (Democratic Republic)"],
  ["CK", "Cook Islands"], ["CR", "Costa Rica"], ["CI", "Côte d’Ivoire"], ["HR", "Croatia"], ["CU", "Cuba"], ["CW", "Curaçao"], ["CY", "Cyprus"],
  ["CZ", "Czechia"], ["DK", "Denmark"], ["DJ", "Djibouti"], ["DM", "Dominica"], ["DO", "Dominican Republic"], ["EC", "Ecuador"], ["EG", "Egypt"],
  ["SV", "El Salvador"], ["GQ", "Equatorial Guinea"], ["ER", "Eritrea"], ["EE", "Estonia"], ["SZ", "Eswatini"], ["ET", "Ethiopia"],
  ["FK", "Falkland Islands"], ["FO", "Faroe Islands"], ["FJ", "Fiji"], ["FI", "Finland"], ["FR", "France"], ["GF", "French Guiana"],
  ["PF", "French Polynesia"], ["TF", "French Southern Territories"], ["GA", "Gabon"], ["GM", "Gambia"], ["GE", "Georgia"], ["DE", "Germany"],
  ["GH", "Ghana"], ["GI", "Gibraltar"], ["GR", "Greece"], ["GL", "Greenland"], ["GD", "Grenada"], ["GP", "Guadeloupe"], ["GU", "Guam"],
  ["GT", "Guatemala"], ["GG", "Guernsey"], ["GN", "Guinea"], ["GW", "Guinea-Bissau"], ["GY", "Guyana"], ["HT", "Haiti"],
  ["HM", "Heard Island and McDonald Islands"], ["VA", "Holy See"], ["HN", "Honduras"], ["HK", "Hong Kong"], ["HU", "Hungary"], ["IS", "Iceland"],
  ["IN", "India"], ["ID", "Indonesia"], ["IR", "Iran"], ["IQ", "Iraq"], ["IE", "Ireland"], ["IM", "Isle of Man"], ["IL", "Israel"], ["IT", "Italy"],
  ["JM", "Jamaica"], ["JP", "Japan"], ["JE", "Jersey"], ["JO", "Jordan"], ["KZ", "Kazakhstan"], ["KE", "Kenya"], ["KI", "Kiribati"],
  ["KP", "Korea (North)"], ["KR", "Korea (South)"], ["XK", "Kosovo"], ["KW", "Kuwait"], ["KG", "Kyrgyzstan"], ["LA", "Laos"], ["LV", "Latvia"],
  ["LB", "Lebanon"], ["LS", "Lesotho"], ["LR", "Liberia"], ["LY", "Libya"], ["LI", "Liechtenstein"], ["LT", "Lithuania"], ["LU", "Luxembourg"],
  ["MO", "Macao"], ["MG", "Madagascar"], ["MW", "Malawi"], ["MY", "Malaysia"], ["MV", "Maldives"], ["ML", "Mali"], ["MT", "Malta"],
  ["MH", "Marshall Islands"], ["MQ", "Martinique"], ["MR", "Mauritania"], ["MU", "Mauritius"], ["YT", "Mayotte"], ["MX", "Mexico"],
  ["FM", "Micronesia"], ["MD", "Moldova"], ["MC", "Monaco"], ["MN", "Mongolia"], ["ME", "Montenegro"], ["MS", "Montserrat"], ["MA", "Morocco"],
  ["MZ", "Mozambique"], ["MM", "Myanmar"], ["NA", "Namibia"], ["NR", "Nauru"], ["NP", "Nepal"], ["NL", "Netherlands"], ["NC", "New Caledonia"],
  ["NZ", "New Zealand"], ["NI", "Nicaragua"], ["NE", "Niger"], ["NG", "Nigeria"], ["NU", "Niue"], ["NF", "Norfolk Island"], ["MK", "North Macedonia"],
  ["MP", "Northern Mariana Islands"], ["NO", "Norway"], ["OM", "Oman"], ["PK", "Pakistan"], ["PW", "Palau"], ["PS", "Palestine"], ["PA", "Panama"],
  ["PG", "Papua New Guinea"], ["PY", "Paraguay"], ["PE", "Peru"], ["PH", "Philippines"], ["PN", "Pitcairn"], ["PL", "Poland"], ["PT", "Portugal"],
  ["PR", "Puerto Rico"], ["QA", "Qatar"], ["RE", "Réunion"], ["RO", "Romania"], ["RU", "Russia"], ["RW", "Rwanda"], ["BL", "Saint Barthélemy"],
  ["SH", "Saint Helena, Ascension and Tristan da Cunha"], ["KN", "Saint Kitts and Nevis"], ["LC", "Saint Lucia"], ["MF", "Saint Martin"],
  ["PM", "Saint Pierre and Miquelon"], ["VC", "Saint Vincent and the Grenadines"], ["WS", "Samoa"], ["SM", "San Marino"], ["ST", "São Tomé and Príncipe"],
  ["SA", "Saudi Arabia"], ["SN", "Senegal"], ["RS", "Serbia"], ["SC", "Seychelles"], ["SL", "Sierra Leone"], ["SG", "Singapore"],
  ["SX", "Sint Maarten"], ["SK", "Slovakia"], ["SI", "Slovenia"], ["SB", "Solomon Islands"], ["SO", "Somalia"], ["ZA", "South Africa"],
  ["GS", "South Georgia and the South Sandwich Islands"], ["SS", "South Sudan"], ["ES", "Spain"], ["LK", "Sri Lanka"], ["SD", "Sudan"],
  ["SR", "Suriname"], ["SJ", "Svalbard and Jan Mayen"], ["SE", "Sweden"], ["CH", "Switzerland"], ["SY", "Syria"], ["TW", "Taiwan"],
  ["TJ", "Tajikistan"], ["TZ", "Tanzania"], ["TH", "Thailand"], ["TL", "Timor-Leste"], ["TG", "Togo"], ["TK", "Tokelau"], ["TO", "Tonga"],
  ["TT", "Trinidad and Tobago"], ["TN", "Tunisia"], ["TR", "Türkiye"], ["TM", "Turkmenistan"], ["TC", "Turks and Caicos Islands"], ["TV", "Tuvalu"],
  ["UG", "Uganda"], ["UA", "Ukraine"], ["AE", "United Arab Emirates"], ["GB", "United Kingdom"], ["US", "United States"],
  ["UM", "United States Minor Outlying Islands"], ["UY", "Uruguay"], ["UZ", "Uzbekistan"], ["VU", "Vanuatu"], ["VE", "Venezuela"], ["VN", "Vietnam"],
  ["VG", "Virgin Islands (British)"], ["VI", "Virgin Islands (U.S.)"], ["WF", "Wallis and Futuna"], ["EH", "Western Sahara"], ["YE", "Yemen"],
  ["ZM", "Zambia"], ["ZW", "Zimbabwe"],
];

const NAMES = new Map(COUNTRIES);

/** Upper-cases and checks a country code; null when it isn't a listed country. */
export function cleanCountry(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toUpperCase();
  return NAMES.has(code) ? code : null;
}

export const isCountryCode = (input: unknown): input is string => cleanCountry(input) !== null;
export const countryName = (code: string | null | undefined) => (code ? (NAMES.get(code.toUpperCase()) ?? null) : null);

/**
 * How a person in `country` pays: India → rupees through Razorpay, everywhere else → US dollars through Stripe.
 * A person who hasn't chosen a country (everyone who signed up before this existed, and visitors we can't place) is treated as India,
 * which is how every existing account has always been billed. An unknown code is treated the same way rather than guessed at.
 */
export function billingRegion(country: string | null | undefined): BillingRegion {
  const code = cleanCountry(country);
  return code && code !== HOME_COUNTRY ? REGIONS.intl : REGIONS.in;
}

/** The region a payment provider serves: used for a person who already pays through one, whatever their country says today. */
export const regionForProvider = (p: PaymentProvider): BillingRegion => (p === "stripe" ? REGIONS.intl : REGIONS.in);

export const currencyForCountry = (country: string | null | undefined): Currency => billingRegion(country).currency;
export const providerForCountry = (country: string | null | undefined): PaymentProvider => billingRegion(country).provider;
/** "rupees" / "US dollars", for sentences. */
export const currencyName = (c: Currency) => (c === "usd" ? "US dollars" : "rupees");
export const providerName = (p: PaymentProvider) => (p === "stripe" ? "Stripe" : "Razorpay");

/** A guess at the visitor's country from the header a CDN adds, or null. Used only to pick which prices the public pricing page shows first. */
export function countryFromHeaders(get: (name: string) => string | null | undefined): string | null {
  for (const h of ["x-vercel-ip-country", "cf-ipcountry", "x-appengine-country", "x-country-code"]) {
    const c = cleanCountry(get(h));
    if (c) return c;
  }
  return null;
}
