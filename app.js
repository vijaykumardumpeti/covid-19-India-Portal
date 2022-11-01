let express = require("express");

let app = express();
let path = require("path");

let sqlite = require("sqlite");
let sqlite3 = require("sqlite3");
let { open } = sqlite;

app.use(express.json());

//additionall
let bcrypt = require("bcrypt");
let jwt = require("jsonwebtoken");

//intializeDBAndServer
let db;
let dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let intializeDBAndServer = async () => {
  db = await open({ filename: dbPath, driver: sqlite3.Database });

  app.listen(3000, () => {
    console.log(`Server Started at: http://localhost:3000/`);
  });
};
intializeDBAndServer();

// User Register API
app.post("/users/", async (request, response) => {
  try {
    const { username, name, password, gender, location } = request.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      const createUserQuery = `
                INSERT INTO
                user (username, name, password, gender, location)
                VALUES
                (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'  
                );`;
      await db.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("User already exists");
    }
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
});

// User Login API

app.post("/login/", async (request, response) => {
  try {
    let { username, password } = request.body;

    let userDetailsQuery = `SELECT * FROM  user WHERE username = ${username};`;
    let user = await db.get(userDetailsQuery);
    let isPasswordMatch = await bcrypt.compare(password, user.password);

    if (user === undefined) {
      response.status(400);
      response.send("Invalid user");
    } else {
      if (isPasswordMatch === false) {
        response.status(400);
        response.status("Invalid password");
      } else {
        let payload = { username: username };
        let jwtToken = jwt.sign(payload, "vijay");
        response.send({ jwtToken });
      }
    }
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
  }
});

//authenticateToken

let authenticateToken = (request, response, next) => {
  let authHeader = request.header["authentication"];

  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "vijay", async (error, payload) => {
      if (error) {
        response.send("Invalid JWT Token");
      } else {
        next();
        request.username = payload.username;
      }
    });
  }
};

//API-2 GET
app.get("/states/", authenticateToken, async (request, response) => {
  let { username } = request;
  let getStatesQuery = `SELECT * FROM state;`;
  let statesArray = await db.all(getStatesQuery);
  response.send(statesArray);
});

////API-3 GET
app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  let { stateId } = request.params;
  let { username } = request;
  let getStatesQuery = `SELECT * FROM state WHERE state_id = ${stateId};`;
  let statesArray = await db.get(getStatesQuery);
  response.send(statesArray);
});
////API-4 POST

app.post("/districts/", authenticateToken, async (request, response) => {
  let { districtName, stateId, cases, cured, active, deaths } = request.body;
  let createDistrictQuery = `
                INSERT INTO district 
                (district_name, state_id, cases, cured, active,deaths)
                VALUES (
                    '${districtName}',
                    '${stateId}',
                    '${cases}',
                    '${cured}',
                    '${active}',
                    '${deaths}',
                );`;
  await db.run(createDistrictQuery);
  response.send("District Successfully Added");
});

////API-5 GET
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    let { districtId } = request.params;
    let { username } = request;

    let getStatesQuery = `
                SELECT 
                * 
                FROM
                    state
                WHERE 
                    district_id = ${districtId};`;

    let districtsArray = await db.get(getStatesQuery);
    response.send(districtsArray);
  }
);

//API-6 DELETE
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    let { districtId } = request.params;
    let { username } = request;
    let deleteQuery = `DELETE FROM district WHERE district_id = ${districtId};`;
    let statesArray = await db.run(deleteQuery);
    response.send(statesArray);
  }
);
//API-7 PUT
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    let { districtName, stateId, cases, cured, active, deaths } = request.body;
    let { districtId } = request.params;

    let updateDistrictQuery = `
        UPDATE 
            district
        SET 
            district_name = '${districtName}', 
            state_id = '${stateId}', 
            cases = '${cases}', 
            cured = '${cured}', 
            active = '${active}', 
            deaths = '${deaths}',
        WHERE 
            district_id = ${districtId};`;

    await db.run(updateDistrictQuery);
    response.send("District Details Updated");
  }
);

//API-8 GET
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    let { stateId } = request.params;
    let getStatsQuery = `
        SELECT 
            SUM(cases),
            SUM(cured),
            SUM(active),
            SUM(deaths)
        FROM 
            district
        WHERE 
            state_id = ${stateId};      `;

    let stateStatObject = await db.get(getStatsQuery);
    response.send(stateStatObject);
  }
);
