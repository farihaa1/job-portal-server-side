const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
const app = express();
require("dotenv").config();

const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

// DB_USER=Job-hunter
// DB_PASS=VPsCtDtBN3N3OqIO

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cd15p.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    const jobsCollection = client.db("Job-Portal").collection("Jobs");
    const applicationCollection = client
      .db("Job-Portal")
      .collection("job_Applications_collection");



      app.post("/jwt", async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '5h'});
  
        res
          .cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
          })
  
          .send({ success: true });
      });

    app.get("/jobs", async (req, res) => {

      const email = req.body.email;
      const sort = req.query?.sort;
      const search = req.query?.search;
      const min = req.query?.min;
      const max = req.query?.max;
  
      let query = {};
      let sortQuery = {};
      if(sort == "true"){
        sortQuery={"salaryRange.min": -1}
      }
      if(search){
        query.location = { $regex: search, $options: "i" };

      }
      // console.log(salaryRange)
      if(email){
        query = {hr_email: email}
      }

      if(min && max){
        query= {
          ...query,
          "salaryRange.min": {$gte:parseInt(min)},
          "salaryRange.max": {$lte:parseInt(max)},
        }
      }


      const cursor = jobsCollection.find(query).sort(sortQuery);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });


    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });
    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await applicationCollection.insertOne(application);

      res.send(result);
    });
    app.get("/job-applications", async (req, res) => {
      const email = req.query.email;
      const query = {
        applicant_email: email,
      };
      const result = await applicationCollection.find(query).toArray();

      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) };
        const job = await jobsCollection.findOne(query1);

        if (job) {
          application.title = job.title;
          application.location = job.location;
          application.company = job.company;
          application.company_logo = job.company_logo;
        }
      }

      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("job is falling from the sky");
});

app.listen(port, () => {
  console.log(`Job is waiting at: ${port}`);
});
