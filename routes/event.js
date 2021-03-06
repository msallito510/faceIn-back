const express = require("express");
const mongoose = require("mongoose");

const uploadMethods = require("../middlewares/cloudinary");

const { uploadEventImage } = uploadMethods;

// const uploadEventImage = require("../middlewares/cloudinary");

const { checkIfLoggedIn } = require("../middlewares/index");

const router = express.Router();
const Event = require("../models/Event");
const User = require("../models/User");
const Like = require("../models/Like");
const Rating = require("../models/Rating");
const Participant = require("../models/Participant");
const Place = require("../models/Place");


router.get("/", checkIfLoggedIn, async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate("owner")
      .populate("belongsToPlace")
      .populate({
        path: "ratings",
        populate: { path: "ratingGivenBy" },
      })
      .populate({
        path: "participants",
        populate: { path: "participant" },
      })
      .populate({
        path: "likes",
        populate: { path: "likeGivenBy" },
      });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.get("/sort", checkIfLoggedIn, async (req, res, next) => {
  try {
    const events = await Event.find({}).sort({ numberOfLikes: 'desc' });
 
    res.json(events);
  } catch (error) {
    next(error);
  }
});

router.get("/owner", checkIfLoggedIn, async (req, res, next) => {
  const { _id } = req.session.currentUser;
  try {
    const onwerHasEvents = await Event.find({ owner: _id });
    res.json(onwerHasEvents);
  } catch (error) {
    next(error);
  }
});

router.get("/:eventId", checkIfLoggedIn, async (req, res, next) => {
  const { eventId } = req.params;
  try {
    const event = await Event.findById(eventId)
      .populate("owner")
      .populate("belongsToPlace")
      .populate({
        path: "ratings",
        populate: { path: "ratingGivenBy" },
      })
      .populate({
        path: "participants",
        populate: { path: "participant" },
      })
      .populate({
        path: "likes",
        populate: { path: "likeGivenBy" },
      });
    if (event) {
      res.json(event);
    } else {
      res.json({});
    }
  } catch (error) {
    next(error);
  }
});

router.post("/add", checkIfLoggedIn, async (req, res, next) => {
  const { _id } = req.session.currentUser;
  const {
    title,
    description,
    // frequency,
    dateStart,
    dateEnd,
    timeStart,
    timeEnd,
    price,
  } = req.body;
  try {
    const user = await User.findById(_id);
    const userId = user._id;
    if (!!user.hasPlace) {
      const placeId = user.hasPlace._id;
      const event = await Event.create({
        owner: userId,
        title,
        description,
        // frequency,
        dateStart,
        dateEnd,
        timeStart,
        timeEnd,
        price,
        belongsToPlace: placeId,
      });
      await User.findByIdAndUpdate(
        userId,
        { $push: { eventsOwner: event._id } },
        { new: true }
      );
      await Place.findByIdAndUpdate(
        placeId,
        { $push: { placeHasEvents: event._id } },
        { new: true }
      );
      res.json(event);
    }
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:eventId/upload-photo',
  checkIfLoggedIn,
  uploadEventImage.single('imageUrl'),
  async (req, res, next) => {
    const { _id } = req.session.currentUser;
    const { eventId } = req.params;
    try {
      console.log("req.file.url ===>", req.file)
      if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
        res.status(400).json({ message: 'Specified id is not valid' });
        return;
      }
      const currentUser = await User.findById(_id);
      const findEvent = await Event.findById(eventId);
      if (currentUser._id.toString() === findEvent.owner._id.toString()) {

        const imgPath = req.file.url;

        if (!req.file) {
          next(new Error('No file uploaded!'));
          return;
        }
        const eventUpdate = await Event.findByIdAndUpdate(
          eventId,
          {
            image: imgPath,
          },
          { new: true },
        );
        res.json(eventUpdate);
      }
    } catch (error) {
      next(error);
    }
  },
);

router.put("/:eventId/edit", checkIfLoggedIn, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      res.status(400).json({ message: "Specified id is not valid" });
      return;
    }
    const { _id } = req.session.currentUser;
    const findUser = await User.findById(_id);
    const userId = findUser._id;
    const { eventId } = req.params;
    const findEvent = await Event.findById(eventId);
    const {
      title,
      description,
      frequency,
      dateStart,
      dateEnd,
      timeStart,
      timeEnd,
      price,
    } = req.body;
    if (userId.toString() === findEvent.owner._id.toString()) {
      const event = await Event.findByIdAndUpdate(
        eventId,
        {
          title,
          description,
          frequency,
          dateStart,
          dateEnd,
          timeStart,
          timeEnd,
          price,
        },
        { new: true },
      );

      res.json(event);
    }
  } catch (error) {
    next(error);
  }
});

router.delete("/:eventId/delete", checkIfLoggedIn, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      res.status(400).json({ message: "Specified id is not valid" });
      return;
    }
    const { _id } = req.session.currentUser;
    const findUser = await User.findById(_id);
    const userId = findUser._id;
    const { eventId } = req.params;
    const findEvent = await Event.findById(eventId);
    // const ratingId =
    // const participantId =
    // const likeId =
    // const placeId =
    if (userId.toString() === findEvent.owner._id.toString()) {
      const event = await Event.findByIdAndDelete(eventId);
      // falta chequearlo
      await User.findByIdAndUpdate(userId, { $pull: { eventsOwner: eventId } }, { new: true });
      // await Tag.findByIdAndUpdate(tagId, { $pull: { tagBelongsToEvents: eventId } }, { new: true });
      // await Rating.findByIdAndUpdate(ratingId, { $pull: { ratingForEvent: eventId } }, { new: true });
      // await Participant.findByIdAndUpdate(participantId, { $pull: { event: eventId } }, { new: true });
      // await Like.findByIdAndUpdate(likeId, { $pull: { likeForEvent: eventId } }, { new: true });
      // await Place.findByIdAndUpdate(placeId, { $pull: { placeHasEvents: eventId } }, { new: true });
      res.json(event);
    } else {
      res.json({});
    }
  } catch (error) {
    next(error);
  }
});

router.get("/:eventId/add-like", checkIfLoggedIn, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      res.status(400).json({ message: "Specified id is not valid" });
      return;
    }
    const { _id } = req.session.currentUser;
    const { eventId } = req.params;
    const findUser = await User.findById(_id);
    const userId = findUser._id;
    const findEventWithLike = await Event.findById(eventId).populate({
      path: "likes",
      populate: { path: "likeGivenBy" },
    });

    function checkUserIdInLikes() {
      if (findEventWithLike.likes.length !== 0) {
        const tempSameId = findEventWithLike.likes.filter(
          (like) => like.likeGivenBy._id.toString() === userId.toString()
        );

        if (tempSameId.length === 0) {
          return true;
        } else {
          return false;
        }
      }
    }

    const userIdNotFound = checkUserIdInLikes();

    function getLikeIdToDelete() {
      if (findEventWithLike.likes.length !== 0) {
        const tempLikeIdToDelete = findEventWithLike.likes.filter(
          (like) => like.likeGivenBy._id.toString() === userId.toString()
        );
        const likeIdToDelete = tempLikeIdToDelete[0]._id;
        return likeIdToDelete;
      }
    }

    if (
      findEventWithLike.likes.length === 0 ||
      (findEventWithLike.likes.length !== 0 && userIdNotFound === true)
    ) {
      const like = await Like.create({
        likeGivenBy: userId,
        likeForEvent: eventId,
      });
      await User.findByIdAndUpdate(
        userId,
        { $push: { likesGiven: like._id } },
        { new: true }
      );
      await Event.findByIdAndUpdate(
        eventId,
        { $push: { likes: like._id } },
        { new: true }
      );
      await Event.findByIdAndUpdate(
        eventId,
        { numberOfLikes: findEventWithLike.likes.length + 1 },
        { new: true }
      );
      res.json(like);
    } else {
      const deleteLike = await Like.findByIdAndDelete(getLikeIdToDelete());
      await User.findByIdAndUpdate(
        userId,
        { $pull: { likesGiven: deleteLike._id } },
        { new: true }
      );
      await Event.findByIdAndUpdate(
        eventId,
        { $pull: { likes: deleteLike._id } },
        { new: true }
      );
      await Event.findByIdAndUpdate(
        eventId,
        { numberOfLikes: findEventWithLike.likes.length - 1 },
        { new: true }
      );
      res.json(deleteLike);
    }
  } catch (error) {
    next(error);
  }
});

router.get("/:eventId/register", checkIfLoggedIn, async (req, res, next) => {
  const { eventId } = req.params;
  const { _id } = req.session.currentUser;
  const findUser = await User.findById(_id);
  const participantId = findUser._id;
  try {
    const alreadyParticipantInEvent = await Participant.find({ participant: participantId, event: eventId });

    if (alreadyParticipantInEvent.length === 0) {
      const participant = await Participant.create({
        participant: participantId,
        event: eventId,
      });
      await User.findByIdAndUpdate(
        participantId,
        { $push: { participantEvents: participant._id } },
        { new: true },
      );
      await Event.findByIdAndUpdate(
        eventId,
        { $push: { participants: participant._id } },
        { new: true },
      );
      res.json(participant);
    } else {
      res.json({});
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;
