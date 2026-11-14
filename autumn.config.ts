import { feature, item, plan } from "atmn";

// One "donation_dollar" unit = $1 donated. Donors buy any quantity once (one-off, prepaid).
export const donationDollars = feature({
  id: "donation_dollars",
  name: "Donation dollars",
  type: "metered",
  consumable: true,
});

export const donation = plan({
  id: "donation",
  name: "Earbass donation",
  addOn: true,
  items: [
    {
      featureId: donationDollars.id,
      price: { amount: 1, billingUnits: 1, billingMethod: "prepaid", interval: "one_off" },
    },
  ],
});

// AI song credits. 30s = 1, 1 min = 2, 2 min = 4, 3 min = 6.
export const songCredits = feature({
  id: "song_credits",
  name: "Song credits",
  type: "metered",
  consumable: true,
});

// Membership perks (PRO badge, songs longer than 1 minute).
export const proAccess = feature({
  id: "pro_access",
  name: "Pro access",
  type: "boolean",
});

/** Credit packs: one-off top-ups that never expire. Bought in whole packs. */
const pack = (id: string, name: string, credits: number, dollars: number) =>
  plan({
    id,
    name,
    addOn: true,
    items: [
      {
        featureId: songCredits.id,
        price: { amount: dollars, billingUnits: credits, billingMethod: "prepaid", interval: "one_off" },
      },
    ],
  });

export const pack10 = pack("pack_10", "10 song credits", 10, 5);
export const pack25 = pack("pack_25", "25 song credits", 25, 10);
export const pack60 = pack("pack_60", "60 song credits", 60, 20);

export const pro = plan({
  id: "pro",
  name: "Earbass Pro",
  group: "membership",
  price: { amount: 10, interval: "month" },
  items: [
    item({ featureId: songCredits.id, included: 40, reset: { interval: "month" } }),
    item({ featureId: proAccess.id }),
  ],
});

export const proByok = plan({
  id: "pro_byok",
  name: "Earbass Pro (own key)",
  group: "membership",
  price: { amount: 4.2, interval: "month" },
  items: [item({ featureId: proAccess.id })],
});

export default {
  features: [donationDollars, songCredits, proAccess],
  plans: [donation, pack10, pack25, pack60, pro, proByok],
};
