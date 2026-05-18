import {
  cancelSubscriptionForUser,
  changeSubscriptionForUser,
  createSubscriptionForUser,
  getMySubscription,
} from "../services/billingSubscriptionService.js";

export async function postCreateBillingSubscription(req, res) {
  const { amount, currency, frequency } = req.body;
  const result = await createSubscriptionForUser({
    userId: req.user.id,
    email: req.user.email,
    amountMajor: amount,
    currency,
    frequency,
  });
  res.status(201).json(result);
}

export async function getBillingSubscriptionMe(req, res) {
  const result = await getMySubscription(req.user.id);
  res.status(200).json(result);
}

export async function postChangeBillingSubscription(req, res) {
  const { amount, currency, frequency } = req.body;
  const result = await changeSubscriptionForUser({
    userId: req.user.id,
    email: req.user.email,
    amountMajor: amount,
    currency,
    frequency,
  });
  res.status(201).json(result);
}

export async function postCancelBillingSubscription(req, res) {
  const { id } = req.params;
  const { cancelAtCycleEnd } = req.body;
  const result = await cancelSubscriptionForUser(req.user.id, id, cancelAtCycleEnd);
  res.status(200).json(result);
}
