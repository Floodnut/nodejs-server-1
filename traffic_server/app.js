/* dependency */
const express = require("express");
const axios = require("axios")
const mysql = require("mysql")

/* route */
const traffic = require("./func/traffic")

/* 상수 */
const app = express();
const MINUTE = 60 * 1000 ;
const PORT = process.env.PORT
const HOST = process.env.HOST
const APPKEY = process.env.APPKEY
const APIKEY = process.env.APIKEY
const dbCon = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPW,
    database: process.env.DB
})

// const cm_ctLat = 35.18840002173209
// const cm_ctLon = 128.62080574035684
const cm_ctLat = 35.216694074228435
const cm_ctLon = 128.633471860886
const j_ctLat = 35.13436955848557
const j_ctLon = 128.73624801635782

const tmaptrafficReq = async (clt, clo) => {
    try{
        const pro = await axios.get(`https://apis.openapi.sk.com/tmap/traffic?version=1&zoomLevel=13&appKey=${APPKEY}&centerLat=${clt}&centerLon=${clo}&reqCoordType=WGS84GEO&resCoordType=WGS84GEO&trafficType=AUTO`)
        return pro;
    }catch(err){
        return err;
    }
}

const trafficReq = async () => {
    try{
        const pro = await axios.get(`https://openapi.its.go.kr:9443/trafficInfo?apiKey=${APIKEY}&type=all&minX=128.3677&maxX=128.8432&minY=35.0521&maxY=35.3906&getType=json`)
        return pro;
    }catch(err){
        return err;
    }
}

const isValid = (a, b, c) =>{
    let aa = false
    let bb = false
    let cc = false
    if (a.startsWith("414") || a.startsWith("415") || a.startsWith("416") || a.startsWith("417")){
        aa = true
    }
    if (b.startsWith("414") || b.startsWith("415") || b.startsWith("416") || b.startsWith("417")){
        bb = true
    }
    if (c.startsWith("414") || c.startsWith("415") || c.startsWith("416") || c.startsWith("417")){
        cc = true
    }

    return aa * bb * cc
}

app.listen(PORT, () => {
    console.log(`${new Date} \n-->> Server start on ${HOST}:${PORT}`)

    setInterval(() => {
        tmaptrafficReq(cm_ctLat, cm_ctLon).then( trafficData =>{
           let tr = traffic.tmaptrafficSearch(trafficData.data, 2)
            try{
                dbCon.query('truncate table tmaptraffic;', (err, result)=>{
                    if(err) throw err;
                });

                for(let idx in tr["trafficData"]){

                    for(let j = 0 ; j < tr["trafficData"][idx]["coor"].length; j += 2){
                        let cong = tr["trafficData"][idx]["congestion"]
                        let lt =  tr["trafficData"][idx]["coor"][j+1]
                        let lon = tr["trafficData"][idx]["coor"][j]
                        let road = tr["trafficData"][idx]["road"]
                        let roadType = tr["trafficData"][idx]["roadType"]
                        let query = `insert into tmaptraffic(congestion, lat, lon, road, roadtype, modified) values(${cong},${lt},${lon},\"${road}\",${roadType},now());`
                        dbCon.query(query, (err, result)=>{
                            if(err) throw err;
                        });
                    }
                }
            }catch(err){
                console.log(err)
            }
        });

        trafficReq().then( trafficData =>{
            try{
                let tr = trafficData.data
                dbCon.query('truncate table traffic;', (err, result)=>{
                    if(err) throw err;
                });

                for(let idx in tr["body"]["items"]){

                    let dt = tr["body"]["items"][idx]
                    let speed = dt["speed"]
                    let linkId = dt["linkId"]
                    let startNodeId = dt["startNodeId"]
                    let endNodeId = dt["endNodeId"]
                    let road = dt["roadName"]
                    
                    if (speed > 50 || road.includes("국도") || road.includes("고속") || road.length == 0){
                        continue;
                    }

                    let roadType = (road.includes("대로") ? 1 : (road.includes("길") ? 3 : 2))

                    if(isValid(linkId, startNodeId, endNodeId)){
                        if(speed <= 50 && speed > 30){
                            let cong = 2
                            let query = `insert into traffic(congestion, linkid, tnode, fnode, road, roadtype, modified) values(${cong},${linkId},${startNodeId},${endNodeId},\"${road}\",${roadType},now());`
                            
                            dbCon.query(query, (err, result)=>{
                                if(err) throw err;
                            });
                        }
                        else if (speed <= 30 && speed > 20){
                            let cong= 3
                            let query = `insert into traffic(congestion, linkid, tnode, fnode, road, roadtype, modified) values(${cong},${linkId},${startNodeId},${endNodeId},\"${road}\",${roadType},now());`

                            dbCon.query(query, (err, result)=>{
                                if(err) throw err;
                            });
                        }                    
                        else if (speed <= 20){
                            let cong = 4
                            let query = `insert into traffic(congestion, linkid, tnode, fnode, road, roadtype, modified) values(${cong},${linkId},${startNodeId},${endNodeId},\"${road}\",${roadType},now());`
                            
                            dbCon.query(query, (err, result)=>{
                                if(err) throw err;
                            });
                        }
                    }      
                }
            }catch(err){
                console.log(err)
            }
        });
    }, 10 * MINUTE);
})
