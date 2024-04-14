const express = require('express')
const cors = require('cors');
const { MongoClient } = require('mongodb');
const mongoose = require('mongoose');
const app = express();
const rateLimit = require('express-rate-limit');
const { ObjectId } = mongoose.Schema.Types;

app.use(express.json());
app.use(cors());

const SECRET = 'SECr3t';  

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
});


const visitSchema = new mongoose.Schema({
    visitorName: String,
    contactDetails: String,
    employeeEmail: String,
    visitorEmail: String,
    visitDate: Date,
    visitTime: String,
    visitStatus: String,
});
const Visit = mongoose.model('Visit', visitSchema);
const User = mongoose.model('User' , userSchema)
mongoose.connect('mongodb+srv://ropz123:Dkmfmb9lzaTJ64IS@atlascluster.n1dl8ny.mongodb.net/test', { useNewUrlParser: true, useUnifiedTopology: true, dbName: "test" });
const visitorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 9, 
  message: 'Too many requests from this IP, please try again later.',
});


app.post('/login', async (req, res) => {
    const { username, password } = req.headers;
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({ message: 'Logged in successfully' });
    } else {
      res.status(403).json({ message: 'Invalid username or password' } );
    }
});


app.post('/visitor/register',visitorLimiter, async (req, res) => {
    const { visitorName, contactDetails, employeeEmail,visitorEmail, visitDate, visitTime } = req.body;
    const newVisit = new Visit({
    visitorName,
    contactDetails,
    employeeEmail,
    visitorEmail,
    visitDate : new Date(visitDate),
    visitTime,
    visitStatus: 'Pending',
    });
    await newVisit.save();
    // sendEmailToVisitor(req.body.visitorEmail);
    res.status(201).json({ message: 'Visit request submitted successfully'});    
});


app.get('/visitor/requests/:visitorEmail', async (req, res) => {
    const visitorEmail = req.params.visitorEmail;

    try {
        const visitorRequests = await Visit.find({ visitorEmail });
        const formattedVisits = visitorRequests.map(visit => ({
            ...visit._doc,
            visitDate: visit.visitDate.toLocaleDateString(),
        }));
        res.status(200).json(formattedVisits);
    } catch (error) {
        console.error('Error fetching visitor requests:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/employee/decision/:visitId', async (req, res) => {
    const { decision } = req.body;
    const visitId  = req.params.visitId;
    const updatedVisit = await Visit.findByIdAndUpdate(
        visitId,
        { visitStatus: decision },
        { new: true }
    );
    if (!updatedVisit) {
        return res.status(404).json({ error: 'Visit not found' });
    }
    else{
        res.status(200).json({ message: 'Visit status updated successfully' });
    }
});


app.get('/security/visits', async (req, res) => {
    const allVisits = await Visit.find();
    
    // Format the date before sending the response
    const formattedVisits = allVisits.map(visit => ({
        ...visit._doc,
        visitDate: visit.visitDate.toLocaleDateString(),
    }));

    res.status(200).json(formattedVisits);
});

app.get('/employee/requests/:employeeEmail', async (req, res) => {
    const employeeEmail = req.params.employeeEmail;
    const employeeRequests = await Visit.find({ employeeEmail }, { visitorName: 1, contactDetails: 1, visitDate: 1, visitTime: 1, visitStatus:1 ,_id: 1 });
    const newEmployeeRequests = employeeRequests.map(visit => ({
        ...visit._doc,
        visitDate: visit.visitDate.toLocaleDateString(),
    }));
    if ( employeeRequests.length === 0){
        return res.status(404).json({ error: 'No visit requests found for the specified employee email' });
    }
    else{
    res.status(200).json(newEmployeeRequests);
    }
});

app.post('/visitor/login/:visitorEmail', async (req, res) => {
    const { visitorEmail } = req.params;
  
    try {
      const visitor = await Visit.findOne({ visitorEmail });
  
      if (visitor) {
        res.json({ exists: true, visitor });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error('Error checking visitor email:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
  
