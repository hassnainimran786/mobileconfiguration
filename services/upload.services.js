const express = require('express');
const app = express();
const handleErr = require('../helpers/handleErr');
const handleSuccess = require('../helpers/handleSuccess');
const uploadMult = require('../helpers/uploadMult');
const Minio = require('minio');
const fs = require('fs');
const { sendMail } = require('../helpers/sendEmail')
const axios = require('axios')
const url = require('url')
const path = require('path')
require('dotenv').config()
const process = require('process')
const emailGroup = process.env.emailGroup
if (!emailGroup) {
    throw new Error("Email group is missing. Please check your .env file")
}


// Add new app
app.post('/newapps', (req, res) => {
    uploadMult(req, res, function (err) {
        if (err) {
            return res.json(handleErr(err));
        } else {
            if (
                req.files !== undefined &&
                req.body.MINIO_USERNAME &&
                req.body.MINIO_PASSWORD &&
                req.body.UPDATE_MOBILE_APP_ENDPOINT &&
                req.body.MINIO_HOST &&
                req.body.MINIO_PORT &&
                req.body.MINIO_SSL &&
                req.body.GUID
            ) {
                let fileData = req.files;
                if (fileData.length > 0) {
                    let {
                        MINIO_USERNAME,
                        MINIO_PASSWORD,
                        UPDATE_MOBILE_APP_ENDPOINT,
                        MINIO_HOST,
                        MINIO_PORT,
                        MINIO_SSL,
                        GUID,
                        email,
                        version
                    } = req.body;
                    console.log("New Request ----> ", req.body)
                    const minioClient = new Minio.Client({
                        endPoint: MINIO_HOST,
                        port: parseInt(MINIO_PORT),
                        useSSL: MINIO_SSL === "true" ? true : false,
                        accessKey: MINIO_USERNAME,
                        secretKey: MINIO_PASSWORD,
                    });
                    const uploaded = {};
                    let filesProcessed = 0;
                    minioClient.bucketExists('builds', function (err, exists) {
                        if (!exists) {
                            minioClient.makeBucket('builds')
                        }
                        else {
                            minioClient.listObjects("builds", "", true).on('data', (obj) => {
                                const objectsToDelete = obj.name
                                minioClient.removeObjects("builds", [objectsToDelete], function (err) {
                                    if (err) {
                                        console.error('Error deleting objects:', err);
                                    } else {
                                        console.log('All objects deleted successfully.');
                                    }
                                });
                            })
                        }
                    })
                    fileData.forEach((file) => {
                        var metaData = {
                            'Content-Type': file.mimetype,
                        };
                        const filePath = file.destination + '/' + file.filename;
                        // Using fPutObject API upload your file to the bucket europetrip.
                        minioClient.fPutObject(
                            'builds',
                            file.filename,
                            filePath,
                            metaData,
                            async (error, etag) => {
                                if (error) {
                                    // console.log("file upload error ---> ",error)
                                    return res.json(handleErr('Error uploading file', error));
                                }
                                const keyname = file.filename.split('.')[1] === 'apk' ? "Android" : "iOS"
                                uploaded[keyname] = { filename: file.filename, etag };
                                filesProcessed++;
                                fs.unlink(filePath, (er) => {
                                    if (er) return res.json(handleErr(er))
                                })
                                if (filesProcessed === fileData.length) {
                                    //Send success to the web server
                                    const headers = {
                                        'Content-Type': 'application/json',
                                        'Authorization': 'Bearer MyApiKey',
                                    };
                                    let baseURL = ""
                                    if (MINIO_HOST && UPDATE_MOBILE_APP_ENDPOINT) {
                                        const parsedUrl = url.parse(UPDATE_MOBILE_APP_ENDPOINT);
                                        const protocol = parsedUrl.protocol === 'https:' ? "https://" : "http://"
                                        baseURL = protocol + MINIO_HOST + "/builds"
                                    }
                                    const data = {
                                        AndroidAppLink: baseURL + "/" + uploaded['Android']['filename'],
                                        IOSAppLink: baseURL + "/" + uploaded['iOS']['filename'],
                                        BuildStatus: 'COMPLETED',
                                    };
                                    if (UPDATE_MOBILE_APP_ENDPOINT) {
                                        if (UPDATE_MOBILE_APP_ENDPOINT.endsWith('/')) {
                                            UPDATE_MOBILE_APP_ENDPOINT = UPDATE_MOBILE_APP_ENDPOINT.slice(0, -1); // Remove the trailing slash
                                        }
                                    }
                                    const requestOptions = {
                                        method: 'PATCH',
                                        headers: headers,
                                        data: JSON.stringify(data),
                                        url: `${UPDATE_MOBILE_APP_ENDPOINT}/${GUID}`,
                                    };
                                    const response = await axios(requestOptions);
                                    const responseData = {
                                        response: response.data,
                                        status: response.status
                                    }
                                    let host = "";
                                    if (UPDATE_MOBILE_APP_ENDPOINT) {
                                        host = UPDATE_MOBILE_APP_ENDPOINT.split('/api')[0];
                                    }
                                    if (email && version && host) {
                                        sendMail(email, "no-reply@devsy.tech", "Congratulations! Your App Request Succeeded", "", [], "buildSuccess", { version: 'Version ' + version, host })
                                    }
                                    // All files processed, return the result
                                    return res.json(handleSuccess(responseData));

                                }
                            }
                        );
                    });
                } else {
                    return res.json(handleErr('Files are required'));
                }
            } else {
                return res.json(handleErr('App Details can not be null'));
            }
        }
    });
});

// Build failed
app.post('/failed', (req, res) => {
    uploadMult(req, res, async function (err) {
        if (err) {
            return res.json(handleErr(err));
        } else {
            if (
                req.files !== undefined
            ) {
                let fileData = req.files;
                if (fileData.length > 0) {
                    let {
                        GUID,
                        APP_NAME,
                        APP_URL,
                        UPDATE_MOBILE_APP_ENDPOINT,
                        email

                    } = req.body;
                    console.log("New Request ----> ", req.body)
                    const attachments = fileData.map((file) => {
                        return {
                            filename: file.filename,
                            path: path.join(__dirname, `../appfiles/${file.filename}`)
                        }
                    })
                    const headers = {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer MyApiKey',
                    };

                    const data = {
                        BuildStatus: 'FAILED',
                    };
                    if (UPDATE_MOBILE_APP_ENDPOINT) {
                        if (UPDATE_MOBILE_APP_ENDPOINT.endsWith('/')) {
                            UPDATE_MOBILE_APP_ENDPOINT = UPDATE_MOBILE_APP_ENDPOINT.slice(0, -1); // Remove the trailing slash
                        }
                    }
                    const requestOptions = {
                        method: 'PATCH',
                        headers: headers,
                        data: JSON.stringify(data),
                        url: `${UPDATE_MOBILE_APP_ENDPOINT}/${GUID}`,
                    };

                    try {
                        const response = await axios(requestOptions);
                        const responseData = {
                            response: response.data,
                            status: response.status
                        }
                        // All files processed, return the result
                        sendMail(emailGroup, "no-reply@devsy.tech", `Build failed of ${APP_NAME} - ${APP_URL} `, "Please check log files for more information", attachments)
                        return res.json(handleSuccess(responseData));
                    } catch (error) {
                        return res.json(handleErr(error.response))
                    }


                } else {
                    return res.json(handleErr('Files are required'));
                }
            } else {
                return res.json(handleErr('App Details can not be null'));
            }
        }
    });
});

module.exports = app;