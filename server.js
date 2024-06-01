const express = require('express')
const app = express()
const mongoose = require('mongoose')

mongoose.connect('mongodb+srv://p22014675:GcIq34ROYbneiGGD@clusters.3xpeqwi.mongodb.net/')
app.listen(3000,()=>console.log('Server Started'))