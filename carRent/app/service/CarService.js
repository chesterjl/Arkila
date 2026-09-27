const Car = require('../models/Car');
const ApiError = require('../utils/ApiError');
const { uploadBuffer, deleteImage } = require('../utils/CloudinaryUtil');
const { CAR_LISTING_STATUS } = require('../config/constants');

const STATUS = CAR_LISTING_STATUS;

const FIELDS = ['name', 'description', 'rentalPrice', 'vehicleType', 'fuelType', 'location', 'seats', 'isAvailable'];
const pick = (obj) => Object.fromEntries(FIELDS.filter((f) => obj[f] !== undefined).map((f) => [f, obj[f]]));

// Fetch a car and verify it belongs to this owner (used by updateCar / removeCar).
const getOwned = async (owner, id) => {
  const car = await Car.findById(id);
  if (!car) throw new ApiError(404, 'Car not found.');
  if (car.owner.toString() !== owner._id.toString()) throw new ApiError(403, 'You are not allowed to access this car.');
  return car;
};

// Fetch a car by id with no ownership check (used by the admin-only approve/reject/suspend/reinstate actions).
const getAny = async (id) => {
  const car = await Car.findById(id);
  if (!car) throw new ApiError(404, 'Car not found.');
  return car;
};

const createCar = async (owner, body, files) => {
  const imageFile = files?.image?.[0];
  const regFile = files?.registrationImage?.[0];
  if (!imageFile) throw new ApiError(400, 'Car image is required (field "image").');
  if (!regFile) throw new ApiError(400, 'Certificate of Registration image is required (field "registrationImage") to prove this car is yours.');

  const img = await uploadBuffer(imageFile.buffer, 'carrent/cars');

  let reg;
  try {
    reg = await uploadBuffer(regFile.buffer, 'carrent/car-registrations');
  } catch (err) {
    await deleteImage(img.imagePublicId);
    throw err;
  }

  try {
    return await Car.create({
      ...pick(body),
      owner: owner._id,
      imageUrl: img.imageUrl,
      imagePublicId: img.imagePublicId,
      registrationImageUrl: reg.imageUrl,
      registrationImagePublicId: reg.imagePublicId,
      listingStatus: STATUS.PENDING,
    });
  } catch (err) {
    await deleteImage(img.imagePublicId);
    await deleteImage(reg.imagePublicId);
    throw err;
  }
};

const updateCar = async (owner, id, body, files) => {
  const car = await getOwned(owner, id);
  Object.assign(car, pick(body));

  const imageFile = files?.image?.[0];
  const regFile = files?.registrationImage?.[0];
  const oldImagePublicId = car.imagePublicId;
  const oldRegPublicId = car.registrationImagePublicId;

  if (imageFile) {
    const img = await uploadBuffer(imageFile.buffer, 'carrent/cars');
    car.imageUrl = img.imageUrl;
    car.imagePublicId = img.imagePublicId;
  }
  if (regFile) {
    const reg = await uploadBuffer(regFile.buffer, 'carrent/car-registrations');
    car.registrationImageUrl = reg.imageUrl;
    car.registrationImagePublicId = reg.imagePublicId;
  }

  // Editing a previously rejected listing sends it back for another admin review
  if (car.listingStatus === STATUS.REJECTED) {
    car.listingStatus = STATUS.PENDING;
    car.adminNote = undefined;
  }

  await car.save();
  if (imageFile) await deleteImage(oldImagePublicId);
  if (regFile) await deleteImage(oldRegPublicId);

  return car;
};

const removeCar = async (owner, id) => {
  const car = await getOwned(owner, id);
  if (!car.isAvailable) {
    throw new ApiError(400, 'This car is currently unavailable and cannot be deleted. Mark it available first, then delete it.');
  }
  await deleteImage(car.imagePublicId);
  await deleteImage(car.registrationImagePublicId);
  await car.deleteOne();
};

const displayCars = async () => {
  return Car.find({listingStatus: STATUS.APPROVED, isAvailable: true,}).populate('owner', 'name brandName')
    .sort({ createdAt: -1 });
};

const getCarById = async (id) => {
  const car = await Car.findById(id).populate('owner', 'name brandName phone');
  if (!car) throw new ApiError(404, 'Car not found.');
  return car;
};


const getAllCarsForOwner = (ownerId) => Car.find({ owner: ownerId }).sort({ createdAt: -1 });
const getAllPendingRentRequestForOwner = (ownerId) => Car.find({ owner: ownerId, listingStatus: STATUS.PENDING }).sort({ createdAt: -1 });

const getAllPendingCarListForAdmin = async () => {
  return await Car.find({ listingStatus: "pending" })
    .populate("owner", "name brandName email phone")
    .sort({ createdAt: -1 });
};

const getAllCarsForAdmin = async () => {
  return await Car.find()
    .populate("owner", "name brandName email phone")
    .sort({ createdAt: -1 });
};

const approveCar = async (id) => {
  const car = await getAny(id);
  if (car.listingStatus === STATUS.APPROVED) throw new ApiError(400, 'Car is already approved.');
  car.listingStatus = STATUS.APPROVED;
  car.adminNote = undefined;
  car.reviewedAt = new Date();
  return car.save();
};

const rejectCar = async (id, reason) => {
  const car = await getAny(id);
  car.listingStatus = STATUS.REJECTED;
  car.adminNote = reason || 'Rejected by admin.';
  car.reviewedAt = new Date();
  return car.save();
};

const suspendCar = async (id, reason) => {
  const car = await getAny(id);
  if (car.listingStatus !== STATUS.APPROVED) throw new ApiError(400, 'Only an approved listing can be suspended.');
  car.listingStatus = STATUS.SUSPENDED;
  car.adminNote = reason || 'Suspended by admin.';
  car.reviewedAt = new Date();
  return car.save();
};

const reinstateCar = async (id) => {
  const car = await getAny(id);
  if (car.listingStatus !== STATUS.SUSPENDED) throw new ApiError(400, 'Only a suspended listing can be reinstated.');
  car.listingStatus = STATUS.APPROVED;
  car.adminNote = undefined;
  car.reviewedAt = new Date();
  return car.save();
};

module.exports = {
  createCar,
  updateCar,
  removeCar,
  displayCars,
  getCarById,
  getAllCarsForOwner,
  getAllPendingRentRequestForOwner,
  getAllPendingCarListForAdmin,
  getAllCarsForAdmin,
  approveCar,
  rejectCar,
  suspendCar,
  reinstateCar,
};