import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import 'dotenv/config'

const app = express();
const port = 7000;


// connection url
const uri = `mongodb+srv://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@cluster0.fp7vkua.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Middleware
app.use(cors());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// main functions
async function run() {
    try {

        // create database
        const productCollection = client.db("eVoucher").collection("allProducts");



        // get all products api
        app.get("/all-products", async (req, res) => {
            const result = await productCollection.find().toArray();

            res.send(result);
        })

        // All operations api
        app.get("/products", async (req, res) => {
            const { search, brand, category, price, sortPrice, sortDate, page, size } = req.query;

            const prevPage = parseInt(page) || 0;
            const dataSize = parseInt(size) || 10;

            const queryData = {};


            // Search operation
            if (search) {
                queryData.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { regularPrice: { $regex: search, $options: "i" } },
                    { categories: { $regex: search, $options: "i" } },
                    { brandName: { $regex: search, $options: "i" } }
                ];
            }
            if (brand) {
                queryData.brandName = brand;
            }
            if (category) {
                queryData.categories = category;
            }
            if (price) {
                const priceNumber = parseFloat(price);
                queryData.$expr = {
                    $lt: [{ $toDouble: "$regularPrice" }, priceNumber]
                };
            }


            // create a pipeline for sorting price

            const sortPipeLine = [
                { $match: queryData },
                {
                    $addFields: {
                        convertedPrice: { $toDouble: "$regularPrice" }
                    }
                }
            ];

            // now we want to sorting price

            if (sortPrice === 'Low to High') {
                sortPipeLine.push({ $sort: { convertedPrice: 1 } }); // Ascending order
            } else if (sortPrice === 'High to Low') {
                sortPipeLine.push({ $sort: { convertedPrice: -1 } }); // Descending order
            }

            // now we want to sorting price
            if (sortDate === "Newest") {
                sortPipeLine.push({ $sort: { addedTime: 1 } })
            }
            else if (sortDate === "Older") {
                sortPipeLine.push({ $sort: { addedTime: -1 } })
            }

            sortPipeLine.push(
                { $skip: prevPage * dataSize },
                { $limit: dataSize }
            )


            // get all result

            try {

                const result = await productCollection.aggregate(sortPipeLine).toArray();

                res.send(result);

            }
            catch (error) {
                res.status(500).send({ message: "Internal Server Error" });
            }



        })

        // Get a single products
        app.get("/products-details",async(req,res)=>{
            const {id} = req.query;
            const result = await productCollection.findOne({_id:new ObjectId(id)});
            res.send(result)
        })


    } catch (err) {
        console.log(err)
    }
}
run().catch(console.dir);


//  port listening

app.listen(port, () => console.log("Server is running on: ", port));
