const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const { getVideoTitle } = require("yt-get");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/convert-mp3", async (req, res) => {
  const videoUrl = req.body.videoUrl;

  if (!videoUrl) {
    return res.render("index", {
      success: false,
      message: "Please enter a video URL",
    });
  }

  let videoId;

  try {
    // Handle standard YouTube URL format
    const url = new URL(videoUrl);
    videoId = url.searchParams.get("v");

    // Handle shortened YouTube URL format
    if (!videoId) {
      const pathSegments = url.pathname.split("/");
      if (pathSegments[1] === "watch") {
        videoId = url.searchParams.get("v");
      } else if (
        pathSegments[1] === "shorts" ||
        pathSegments[1] === "playlist"
      ) {
        throw new Error("Unsupported URL type");
      } else {
        videoId = pathSegments[1];
      }
    }

    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }
  } catch (error) {
    return res.render("index", {
      success: false,
      message: "Invalid YouTube URL",
    });
  }

  // Get video title using yt-get
  const fullVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let videoTitle;
  try {
    videoTitle = await getVideoTitle(fullVideoUrl);
    console.log(videoTitle);
  } catch (error) {
    console.error("Error fetching video title:", error);
    return res.render("index", {
      success: false,
      message: "Failed to fetch video title",
    });
  }

  const encodedUrl = encodeURIComponent(videoUrl);
  const fetchUrl = `https://youtube-mp3-downloader2.p.rapidapi.com/ytmp3/ytmp3/custom/?url=${encodedUrl}&quality=320`;
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-key": process.env.API_KEY,
      "x-rapidapi-host": process.env.API_HOST,
    },
  };

  try {
    const response = await fetch(fetchUrl, options);
    const result = await response.json();
    console.log(result);

    if (result.status === "finished") {
      const { dlink } = result;
      const fileName = `${videoTitle}.mp3`.replace(/[^a-zA-Z0-9]/g, "_"); // Make filename safe

      return res.render("index", {
        success: true,
        song_title: videoTitle,
        song_link: dlink,
        file_name: fileName,
      });
    } else {
      return res.render("index", {
        success: false,
        message: result.msg,
      });
    }
  } catch (error) {
    console.error("Error fetching conversion result:", error);
    return res.render("index", {
      success: false,
      message: "Failed to fetch data from API",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
