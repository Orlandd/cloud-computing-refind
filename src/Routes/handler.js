const crypto = require("crypto");
const predictClassification = require("../Service/inferenceService");
const storeData = require("../Service/storeData");
// const createPool = require("../Service/createPool");
// const mysql = require("mysql2/promise");
// const { Connector } = require("@google-cloud/cloud-sql-connector");
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client');
const Boom = require('@hapi/boom');
// let pool;

const accessValidation = (request, h) => {
  const { authorization } = request.headers;

  console.log(authorization);

  if (typeof authorization === 'undefined') {
      return Boom.unauthorized('Access denied');
  }

  if (!authorization.startsWith('Bearer ')) {
      return Boom.unauthorized('Access denied');
  }

  const token = authorization.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  try {
      const jwtDecode = jwt.verify(token, secret);
      request.userData = jwtDecode;
  } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return Boom.unauthorized('Access denied');
  }

  return h.continue;
};

// Login 
const prisma = new PrismaClient();
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/auth/google/callback'
)

const scopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

const authorizationUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  include_granted_scopes: true
})


function login(request, h) {
  return h.redirect(authorizationUrl)
}

async function loginCallback (request, h) {
  const { code } = request.query;
  const {tokens} = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  const Oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2'
  })

  const { data } = await Oauth2.userinfo.get();

  console.log(data);

  if(!data.email || !data.name){
      return res.json({
          data: data,
      })
  }

  let user = await prisma.Users.findUnique({
                where: {
                    email: data.email
                }
            })

  if(!user){
      user = await prisma.Users.create({
          data: {
              username: data.name,
              email: data.email,
              token: "asdas"
          }
      })
  }

  console.log(user);

  const payload = {
      id: user?.id,
      name: user?.name,
      address: user?.address
  }

  const secret = process.env.JWT_SECRET;
  const expiresIn = 60 * 60 * 1;
  const token = jwt.sign(payload, secret, {expiresIn: expiresIn})


  return h.response({
      data: {
          id: user.ID,
          name: user.username,
      },
      token: token
  }).code(200);
}

async function postPredictHandler(request, h) {
  const { image } = request.payload;
  // const { user } = request.payload;
  // const { token } = request.payload;
  const { model } = request.server.app;

  // validasi input
  if (!image) {
    const response = h.response({
      status: "fail",
      message: "Invalid input. Missing required fields.",
    });
    response.code(400);
    return response;
  }

  // auth
  // if ((await auth(user, token)) === 0) {
  //   const response = h.response({
  //     status: "failed",
  //     message: "User unauthorized.",
  //   });
  //   response.code(401);
  //   return response;
  // }

  const imageSize = Buffer.byteLength(image, "base64");

  if (imageSize > 10000000) {
    const response = h.response({
      status: "fail",
      message: "Payload content length greater than maximum allowed: 10000000",
    });
    response.code(413);
    return response;
  }

  console.log("testingg")

  const { label } = await predictClassification(model, image);
  const createdAt = new Date().toISOString();
  const [result, id, treatment] = await getDataCrafts(label);

  console.log(`label : ${label}`)

  // cek result
  if (result.error) {
    const response = h.response({
      status: "fail",
      message: `Error retrieving crafts: ${result.error}`,
    });
    response.code(500);
    return response;
  }

  const data = {
    id_trash: id,
    result: label,
    treatment,
    sugesstion: result,
    createdAt,
  };

  // upload ke database
  // if (result.length !== 0) {
  //   await storeData(user, result);
  // }

  const response = h.response({
    status: "success",
    message: "Model is predicted successfully",
    data,
  });
  response.code(201);

  return response;
}

async function bookmark(request, h) {
  const { user } = request.payload;
  // const { token } = request.payload;
  const { craft } = request.payload;

  if (!user && craft) {
    const response = h.response({
      status: "fail",
      message: "Invalid input. Missing required fields.",
    });
    response.code(400);
    return response;
  }

  // auth
  // if ((await auth(user, token)) === 0) {
  //   const response = h.response({
  //     status: "failed",
  //     message: "User unauthorized.",
  //   });
  //   response.code(401);
  //   return response;
  // }

  await storeData(user, craft);

  const response = h.response({
    status: "success",
    message: "Bookmark has added",
  });
  response.code(201);

  return response;
}

// async function auth(id, token) {
//   try {
//     if (!pool) {
//       pool = await createPool(); // Inisialisasi pool jika belum ada
//     }

//     const conn = await pool.getConnection();

//     const query = `SELECT token FROM Users WHERE id = ?;`;
//     const [rows] = await conn.query(query, [id]);

//     const getToken = rows[0]?.token;

//     if (getToken !== token) {
//       await conn.release();
//       return 0; // Tidak sah
//     }

//     await conn.release();
//     return 1; // Sah
//   } catch (err) {
//     console.error("Error in auth:", err.message);
//     return { error: err.message };
//   }
// }

async function getDataCrafts(label) {
  try {
    // if (!pool) {
    //   pool = await createPool(); // Inisialisasi pool jika belum ada
    // }

    // const conn = await pool.getConnection();

    // const query = `SELECT * FROM Trash WHERE type = ?;`;
    // const [rows] = await conn.query(query, [label]);

    const rows = await prisma.Trash.findMany({
      where: {
        type: label
      }
    })

    const id = rows[0]?.ID;
    const treatment = rows[0]?.treatment;


    // console.log(`id trash : ${JSON.stringify(rows)}`)
    // console.log(`id trash : ${id}`)

    // const query2 = `
    //     SELECT * 
    //     FROM Trash_Crafts AS TC
    //     JOIN Crafts AS C ON TC.craft_id = C.id
    //     WHERE TC.trash_id = ?;
    // `;
    // const [result] = await conn.query(query2, [id]);

    const result = await prisma.Trash_Crafts.findMany({
      where: {
        trash_id: id
      },
      include: {
        Crafts: true // ini akan mengikutsertakan data dari tabel 'Crafts' yang terkait
      }
    })

    // await conn.release();
    return [result, id, treatment];
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

async function indexTrash(request, h) {
  try {
    // if (!pool) {
    //   pool = await createPool(); // Inisialisasi pool jika belum ada
    // }

    // const conn = await pool.getConnection();

    const query = `SELECT * FROM Trash;`;
    // const [result] = await conn.query(query);

    const result = await prisma.Trash.findMany();


    // await conn.release();

    const response = h.response({
      status: "success",
      result,
    });
    response.code(200);

    return response;
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

async function indexCrafts(request, h) {
  try {
    // if (!pool) {
    //   pool = await createPool(); // Inisialisasi pool jika belum ada
    // }

    const { label } = request.params;

    // const conn = await pool.getConnection();

    // const query = `SELECT * FROM Trash WHERE type = ?;`;
    // const [rows] = await conn.query(query, [label]);

    const rows = await prisma.Trash.findMany({
      where: {
        type: label
      }
    })

    const id = rows[0]?.ID;
    const treatment = rows[0]?.treatment;

    console.log(`id trash : ${JSON.stringify(rows)}`)
    console.log(`id trash : ${id}`)

    // const query2 = `
    //     SELECT * 
    //     FROM Trash_Crafts AS TC
    //     JOIN Crafts AS C ON TC.craft_id = C.id
    //     WHERE TC.trash_id = ?;
    // `;
    // const [result] = await conn.query(query2, [id]);

    const result = await prisma.Trash_Crafts.findMany({
      where: {
        trash_id: id
      },
      include: {
        Crafts: true 
      }
    });

    // await conn.release();

    const response = h.response({
      status: "success",
      result,
    });
    response.code(200);

    return response;
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

async function indexCraft(request, h) {
  try {
    // if (!pool) {
    //   pool = await createPool(); // Inisialisasi pool jika belum ada
    // }

    const { id } = request.params;

    // const conn = await pool.getConnection();

    // const query2 = `
    //     SELECT * 
    //     FROM Trash_Crafts AS TC
    //     JOIN Crafts AS C ON TC.craft_id = C.id
    //     WHERE TC.ID = ?;
    // `;
    // const [result] = await conn.query(query2, [id]);

    const result = await prisma.Trash_Crafts.findUnique({
      where: {
        ID: Number(id) 
      },
      include: {
        Crafts: true 
      }
    });

    // await conn.release();

    const response = h.response({
      status: "success",
      result,
    });
    response.code(200);

    return response;
  } catch (err) {
    console.error("Error in getAllCraft:", err.message);
    return { error: err.message };
  }
}

async function historyByUserId(request, h) {
  try {
    // if (!pool) {
    //   pool = await createPool(); // Menginisialisasi pool hanya sekali
    // }

    const { id } = request.params;

    // const conn = await pool.getConnection();

    // Query untuk mendapatkan data histori berdasarkan user_id
    // const query = `
    //   SELECT 
    //     H.ID AS history_id,
    //     H.create_at,
    //     U.username,
    //     U.email,
    //     T.type AS trash_type,
    //     C.name AS craft_name,
    //     C.tools_materials,
    //     C.step
    //   FROM Histories AS H
    //   JOIN Users AS U ON H.user_id = U.ID
    //   JOIN Trash_Crafts AS TC ON H.trash_craft_id = TC.ID
    //   JOIN Trash AS T ON TC.trash_id = T.ID
    //   JOIN Crafts AS C ON TC.craft_id = C.ID
    //   WHERE H.user_id = ?;
    // `;

    // const [result] = await conn.query(query, [id]);

    const histories = await prisma.Histories.findMany({
      where: {
        user_id: Number(id), // Ganti 'user_id' sesuai dengan nama kolom di model Prisma Anda
      },
      select: {
        ID: true, // Sesuaikan dengan nama field Prisma Anda
        create_at: true,
        Users: {
          select: {
            username: true,
            email: true,
          },
        },
        Trash_Crafts: {
          select: {
            Trash: {
              select: {
                type: true,
              },
            },
            Crafts: {
              select: {
                name: true,
                tools_materials: true,
                step: true,
              },
            },
          },
        },
      },
    });

    // await conn.release();

    if (histories.length === 0) {
      const response = h.response({
        status: "fail",
        message: `No history found for user_id: ${id}`,
      });
      response.code(404);
      return response;
    }

    const response = h.response({
      status: "success",
      histories,
    });
    response.code(200);

    return response;
  } catch (err) {
    console.error("Error in historyByUserId:", err.message);
    const response = h.response({
      status: "fail",
      message: err.message,
    });
    response.code(500);

    return response;
  }
}

module.exports = {
  postPredictHandler,
  bookmark,
  indexTrash,
  indexCrafts,
  indexCraft,
  historyByUserId,
  login,
  loginCallback, 
  accessValidation,
};
