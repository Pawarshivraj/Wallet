const router = require("express").Router();
const Transaction = require("../models/transactionsModel");
const User = require("../models/userModel");
const authMiddleware = require("../middlewares/authMiddleware");
const stripe = require("stripe")(process.env.stripe_key);
const { v4: uuid } = require("uuid");
// transfer money from one account to another
router.post("/transfer-funds", authMiddleware, async (req, res) => {
  try {
    // saving a transaction
    const newTransaction = new Transaction(req.body);
    await newTransaction.save();

    //decrease sender balance
    await User.findByIdAndUpdate(req.body.sender, {
      $inc: { balance: -req.body.amount },
    });
    // increase receiver balance
    await User.findByIdAndUpdate(req.body.receiver, {
      $inc: { balance: req.body.amount },
    });
    res.send({
      message: "Transaction successfully",
      data: newTransaction,
      success: true,
    });
  } catch (error) {
    res.send({
      message: "transactions failed",
      data: error.message,
      success: false,
    });
  }
});

//verify receiver account number
router.post("/verify-account", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.body.receiver });
    if (user) {
      res.send({
        message: "Account Verified",
        data: user,
        success: true,
      });
    } else {
      res.send({
        message: "Account not found",
        data: null,
        success: false,
      });
    }
  } catch (error) {
    res.send({
      message: "Account not found",
      data: null,
      success: false,
    });
  }
});

//get All transaction for a user
router.post(
  "/get-all-transactions-by-user",
  authMiddleware,
  async (req, res) => {
    try {
      const transactions = await Transaction.find({
        $or: [{ sender: req.body.userId }, { receiver: req.body.userId }],
      })
        .sort({ createdAt: -1 })
        .populate("sender")
        .populate("receiver");
      res.send({
        message: "Transactions fetched",
        data: transactions,
        success: true,
      });
    } catch (error) {
      res.send({
        message: "Transactions not fetched",
        data: error.message,
        success: false,
      });
    }
  }
);

// Deposit funds using stripe
router.post("/deposit-funds", authMiddleware, async (req, res) => {
  try {
    const { token, amount } = req.body;

    // Check if token and amount are provided
    if (!token || !amount) {
      return res.send({
        message: "Token or amount is missing",
        success: false,
      });
    }

    // Create the customer in Stripe
    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });

    // Stripe expects the amount to be in cents, so we multiply by 100
    const charge = await stripe.charges.create(
      {
        amount: amount * 100, // Convert dollars to cents
        currency: "usd",
        customer: customer.id,
        receipt_email: token.email,
        description: `Deposited to wallet`,
      },
      {
        idempotencyKey: uuid(), // Ensure unique transaction
      }
    );

    // Check if the charge was successful
    if (charge.status === "succeeded") {
      const newTransaction = new Transaction({
        sender: req.body.userId,
        receiver: req.body.userId,
        amount: amount,
        type: "deposit",
        reference: "stripe deposit",
        status: "success",
      });
      await newTransaction.save();

      // Increase user balance
      await User.findByIdAndUpdate(req.body.userId, {
        $inc: { balance: amount },
      });

      res.send({
        message: "Transaction successful",
        data: newTransaction,
        success: true,
      });
    } else {
      res.send({
        message: "Transaction failed",
        data: charge,
        success: false,
      });
    }
  } catch (error) {
    console.error("Stripe error:", error); // Log error for debugging
    res.send({
      message: "Transaction failed",
      data: error.message, // Return the error message
      success: false,
    });
  }
});

module.exports = router;
