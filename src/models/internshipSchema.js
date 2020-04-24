import mongoose from 'mongoose';
import geocoder from '../utils/geocoder.js';
import ErrorResponse from '../utils/ErrorResponse.js';

const RequirementSchema = new mongoose.Schema({
  requirement: {
    $type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Requirement text is limited to 100 charachters']
  },
  type: {
    $type: String,
    required: true,
    enum: [
      'must',
      'advantage',
      'optional'
    ]
  }
}, {
  _id: false,
  typeKey: '$type'
});

const PointSchema = new mongoose.Schema({
  type: {
    $type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    $type: [],
    required: true
  }
}, {
  _id: false,
  typeKey: '$type'
});

const InternshipSchema = new mongoose.Schema({
  jobId: {
    type: Number,
    default: 0,
    index: true
  },
  field: {
    type: String,
    required: [true, 'Please add a field'],
    unique: true,
    trim: true,
    maxlength: [50, 'Field cannot be more than 50 charachters']
  },
  description: {
    type: String,
    required: [true, 'Please add description'],
    unique: true,
    trim: true,
    maxlength: [600, 'Description text is limited to 600 charachters']
  },
  fullAddress: {
    type: String,
    required: [true, 'Please Enter full address']
  },
  address: {
    formattedAddress: String,
    street: String,
    city: String,
    state: String,
    country: String
  },
  geoPosition: PointSchema,
  requirements: {
    type: [RequirementSchema],
    required: true
  },
  estimatedEmploymentTime: {
    type: Number,
    required: [true, 'Please enter an estimated time of employment between 3 and 12 months'],
    min: [3, 'Internship must be at least 3 months'],
    max: [12, 'Internship must be no longer than 12 months (1 year)']
  },
  companyName: String
}, {
  timestamps: true
});

// set index for the GeoJSON field
InternshipSchema.index({
  'geoPosition': '2dsphere'
});

// set company name
InternshipSchema.pre('save', function (next) {
  const parent = this.parent();
  this.companyName = parent.companyName;
  next();
});

// check if there's no identical jobId
InternshipSchema.pre('validate', function (next) {

  const allInternships = this.parent().internships;
  const jobIds = allInternships.map(internship => internship.jobId);

  // check to see if there duplicants of the new jobId
  if (jobIds.filter(id => id === this.jobId).length > 1) {
    throw new ErrorResponse(`The jobId ${this.jobId} already exists in the database`, 403);
  }

  next();
});

// set the GeoJSON field
InternshipSchema.pre('save', async function (next) {

  const geoDetails = await geocoder.geocode(this.fullAddress);

  const lat = geoDetails[0].latitude;
  const long = geoDetails[0].longitude;

  this.geoPosition = {
    type: "Point",
    coordinates: [long, lat]
  };

  this.address = {
    formattedAddress: geoDetails[0].formattedAddress,
    street: geoDetails[0].streetName,
    city: geoDetails[0].city,
    state: geoDetails[0].stateCode,
    country: geoDetails[0].countryCode
  };

  // ignore original address
  this.fullAddress = undefined;

  next();
});


export default InternshipSchema;