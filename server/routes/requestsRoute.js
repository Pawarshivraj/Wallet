const router = require("express").Router();
const { request } = require("express");
const Request = require("../models/requestsModel");
const authMiddleware = require("../middlewares/authMiddleware");
const User =require("../models/userModel");
const Transaction =require("../models/transactionsModel");
// get all request for user
router.post("/get-all-requests-by-user",authMiddleware, async (req, res) => {
  try {
    const requests = await Request.find({
      $or: [{ sender: req.body.userId }, { receiver: req.body.userId }],
    })
      .populate("sender")
      .populate("receiver").sort({createdAt:-1});

    res.send({
      data: requests,
      message: "Requests fetch successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// send request to another user
router.post("/send-request", authMiddleware,async (req, res) => {
  try {
    const { receiver, amount, description } = req.body;
    const request = new Request({
      sender: req.body.userId,
      receiver,
      amount,
      description,
    });
    await request.save();
    res.send({
      data: request,
      message: "Request send successfully",
      success: true,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/update-request-status",authMiddleware, async(req,res)=>{
   


  try {
    if(req.body.status === "accepted")
    {
      // create a transaction 
      const transaction= new Transaction({
        sender:req.body.receiver._id,
        receiver:req.body.sender._id,
        amount:req.body.amount,
        reference:req.body.description,
        status:"success"
      })
      await transaction.save();

      //deduct amount form the sender
      await User.findByIdAndUpdate(req.body.sender._id,{
        $inc :{balance:req.body.amount},
      })
      // add the amount to receiver
      await User.findByIdAndUpdate(req.body.receiver._id,{
        $inc:{balance:-req.body.amount}
      })      
    }
    //update the request status
    await Request.findByIdAndUpdate(req.body._id,{
      status:req.body.status
    })
    
    res.send({
      data:null,
      message:"Request updated successfully",
      success:true
    })
  } catch (error) {
    res.send({
      data:error,
      message:"Request update failed",
      success:false
    });
  }
})
module.exports = router;