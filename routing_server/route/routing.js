/* dependency */
const express = require("express");
const axios = require("axios");

/* func */
const distance = require("../func/distance");
const { response } = require("express");


/* 상수 */
const router = express.Router()
const APPKEY = process.env.APPKEY
const host = 'https://apis.openapi.sk.com'

/* HTTP Routing Header */
const headers = {
    "Content-Type": "application/json",
    "appKey" : APPKEY
}

/* Routing Main */
router.get("/routing", (req, res) => {
    let srcLati = req.query.srcLati
    let srcLongti = req.query.srcLongti
    let dstLati = req.query.dstLati
    let dstLongti = req.query.dstLongti
    let zoom = req.query.zoom
    let congestion = req.query.congestion
    let sop = req.query.sop
    let pass_list = req.query.passList

    if(typeof(srcLati) == "string"){
        srcLati = parseFloat(srcLati)
    }
    if(typeof(dstLati) == "string"){
        dstLati = parseFloat(dstLati)
    }
    if(typeof(srcLongti) == "string"){
        srcLongti = parseFloat(srcLongti)
    }
    if(typeof(dstLongti) == "string"){
        dstLongti = parseFloat(dstLongti)
    }

    let data = {
        startX : srcLongti,
        startY : srcLati,
        endX : dstLongti,
        endY : dstLati,
        reqCoordType : "WGS84GEO",
        resCoordType : "WGS84GEO",
        startName : "출발지",
        endName : "도착지",
        searchOption : sop
    }

    minLati = srcLati > dstLati ? dstLati : srcLati
    minLongi = srcLongti > dstLongti ? dstLongti : srcLongti
    maxLati = srcLati < dstLati ? dstLati : srcLati
    maxLongi = srcLongti < dstLongti ? dstLongti : srcLongti

    axiosReq(data).then(returnData => { 
        resData = distance.nodeCheck(
            returnData.data, 
            srcLati, 
            srcLongti, 
            dstLati, 
            dstLongti
        )

        res.send(resData)

    }).catch(error => {
        res.send({
            "error" : "request_Error", 
            data : error
        })
    })
});

/* Routing Request */
const axiosReq = async (data) => {
    try{
        const promise = await axios.post('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1', data, {headers})
        return promise;
    }catch(err){
        return err;
    }
}

module.exports = router;