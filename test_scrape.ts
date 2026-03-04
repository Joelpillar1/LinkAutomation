import dotenv from "dotenv";
dotenv.config();

async function fetchProfile() {
  const apiKey = process.env.SCRAPE_CREATORS_API_KEY;
  const url = "https://www.linkedin.com/in/joel-pillar";
  
  if (!apiKey) {
    console.error("SCRAPE_CREATORS_API_KEY not found in environment.");
    return;
  }

  console.log(`Fetching profile data for: ${url}`);
  try {
    const response = await fetch(`https://api.scrapecreators.com/v1/linkedin/profile?url=${encodeURIComponent(url)}`, {
      headers: {
        "x-api-key": apiKey
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.error(`Error (${response.status}):`, text);
    }
  } catch (error) {
    console.error("Fetch error:", error);
  }
}

fetchProfile();
