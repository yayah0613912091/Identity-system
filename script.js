const holidays = {
  "0101": "New Year's Day",
  "0321": "Human Rights Day",
  "0427": "Freedom Day",
  "0501": "Workers' Day",
  "0616": "Youth Day",
  "0809": "National Women's Day",
  "0924": "Heritage Day",
  1216: "Day of Reconciliation",
  1225: "Christmas Day",
  1226: "Day of Goodwill",
};

function validateIdNumber(idNumber) {
  const searchBtn = document.getElementById("searchBtn");
  const resultDiv = document.getElementById("result");

  // Clear previous results
  resultDiv.textContent = "";
  document.getElementById("decodedInfo").textContent = "";

  if (!/^\d{13}$/.test(idNumber)) {
    showResult("Please enter a valid 13-digit South African ID number.", true);
    searchBtn.disabled = true;
    return false;
  }

  // Extract components
  const birthYear = parseInt(idNumber.substring(0, 2));
  const birthMonth = parseInt(idNumber.substring(2, 4));
  const birthDay = parseInt(idNumber.substring(4, 6));
  const gender = parseInt(idNumber.charAt(6));
  const citizenship = idNumber.charAt(10);

  // Validate date
  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) {
    showResult("Invalid birth date in ID number.", true);
    searchBtn.disabled = true;
    return false;
  }

  // Validate citizenship
  if (citizenship !== "0" && citizenship !== "1") {
    showResult("Invalid citizenship status in ID number.", true);
    searchBtn.disabled = true;
    return false;
  }

  // South African ID Number validation algorithm
  let sum = 0;
  let isSecond = false;

  // Loop through digits from right to left
  for (let i = idNumber.length - 1; i >= 0; i--) {
    let d = parseInt(idNumber.charAt(i));

    if (isSecond) {
      d *= 2;
      if (d > 9) {
        d -= 9;
      }
    }

    sum += d;
    isSecond = !isSecond;
  }

  if (sum % 10 !== 0) {
    showResult("Invalid ID number checksum.", true);
    searchBtn.disabled = true;
    return false;
  }

  searchBtn.disabled = false;
  return true;
}

function decodeIdNumber(idNumber) {
  const birthYear = parseInt(idNumber.substring(0, 2));
  const birthMonth = parseInt(idNumber.substring(2, 4));
  const birthDay = parseInt(idNumber.substring(4, 6));
  const gender = parseInt(idNumber.charAt(6));
  const citizenship = idNumber.charAt(10);

  // Determine full year (1900s or 2000s)
  const fullYear = birthYear < 50 ? 2000 + birthYear : 1900 + birthYear;

  const decodedInfo = {
    dateOfBirth: `${birthDay}/${birthMonth}/${fullYear}`,
    gender: gender >= 5 ? "Male" : "Female",
    citizenship: citizenship === "0" ? "SA Citizen" : "Permanent Resident",
  };

  return decodedInfo;
}

function checkHoliday() {
  const idInput = document.getElementById("idNumber").value;

  if (!validateIdNumber(idInput)) {
    return;
  }

  // Extract date and check holiday
  const birthMonth = idInput.substring(2, 4);
  const birthDay = idInput.substring(4, 6);
  const dateKey = birthMonth + birthDay;

  // Show decoded information
  const decodedInfo = decodeIdNumber(idInput);
  const decodedDiv = document.getElementById("decodedInfo");
  decodedDiv.innerHTML = `
                <h3>Decoded ID Information:</h3>
                <p>Date of Birth: ${decodedInfo.dateOfBirth}</p>
                <p>Gender: ${decodedInfo.gender}</p>
                <p>Citizenship Status: ${decodedInfo.citizenship}</p>
            `;

  if (holidays[dateKey]) {
    showResult(`Your birthday falls on ${holidays[dateKey]}! 🎉`, false);
  } else {
    showResult(
      "Your birthday does not fall on any major South African public holiday.",
      false
    );
  }
}

function showResult(message, isError) {
  const resultDiv = document.getElementById("result");
  resultDiv.textContent = message;
  resultDiv.className = isError ? "error" : "success";
}

// Initialize IndexedDB
let db;
const dbName = "SAIDCheckDB";
const request = indexedDB.open(dbName, 1);

request.onerror = (event) => {
  console.error("Database error:", event.target.error);
};

request.onupgradeneeded = (event) => {
  db = event.target.result;

  // Create object store for ID records
  const idStore = db.createObjectStore("idRecords", { keyPath: "idNumber" });

  // Create indexes
  idStore.createIndex("dateOfBirth", "dateOfBirth", { unique: false });
  idStore.createIndex("gender", "gender", { unique: false });
  idStore.createIndex("citizenship", "citizenship", { unique: false });
  idStore.createIndex("searchCount", "searchCount", { unique: false });
};

request.onsuccess = (event) => {
  db = event.target.result;
};

function updateSearchRecord(idNumber, decodedInfo) {
  const transaction = db.transaction(["idRecords"], "readwrite");
  const store = transaction.objectStore("idRecords");

  // Try to get existing record
  const getRequest = store.get(idNumber);

  getRequest.onsuccess = (event) => {
    const existingRecord = event.target.result;
    let record;

    if (existingRecord) {
      // Update existing record
      record = {
        ...existingRecord,
        searchCount: existingRecord.searchCount + 1,
        lastSearched: new Date().toISOString(),
      };
    } else {
      // Create new record
      record = {
        idNumber: idNumber,
        dateOfBirth: decodedInfo.dateOfBirth,
        gender: decodedInfo.gender,
        citizenship: decodedInfo.citizenship,
        searchCount: 1,
        firstSearched: new Date().toISOString(),
        lastSearched: new Date().toISOString(),
      };
    }

    // Save record
    store.put(record);

    // Update stats display
    displaySearchStats(record);
  };
}

function displaySearchStats(record) {
  const statsDiv = document.getElementById("searchStats");
  statsDiv.innerHTML = `
        <h3>Search Statistics</h3>
        <p>Times this ID has been searched: ${record.searchCount}</p>
        <p>First searched: ${new Date(
          record.firstSearched
        ).toLocaleDateString()}</p>
        <p>Last searched: ${new Date(
          record.lastSearched
        ).toLocaleDateString()}</p>
    `;
}

// Modify the checkHoliday function to include database update
async function checkHoliday() {
  const idInput = document.getElementById("idNumber").value;

  if (!validateIdNumber(idInput)) {
    return;
  }

  // Extract date and check holiday
  const birthMonth = idInput.substring(2, 4);
  const birthDay = idInput.substring(4, 6);
  const dateKey = birthMonth + birthDay;

  // Get decoded information
  const decodedInfo = decodeIdNumber(idInput);

  // Update database record
  updateSearchRecord(idInput, decodedInfo);

  // Display decoded information
  const decodedDiv = document.getElementById("decodedInfo");
  decodedDiv.innerHTML = `
        <h3>Decoded ID Information:</h3>
        <p>Date of Birth: ${decodedInfo.dateOfBirth}</p>
        <p>Gender: ${decodedInfo.gender}</p>
        <p>Citizenship Status: ${decodedInfo.citizenship}</p>
    `;

  if (holidays[dateKey]) {
    showResult(`Your birthday falls on ${holidays[dateKey]}! 🎉`, false);
  } else {
    showResult(
      "Your birthday does not fall on any major South African public holiday.",
      false
    );
  }
}
const API_KEY = "24c5e86734eb44dc4a962826324a5546e74dc42f";

async function fetchHolidays(year) {
  try {
    const response = await fetch(
      `https://calendarific.com/api/v2/holidays?api_key=${API_KEY}&country=ZA&year=${year}&type=national`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch holidays");
    }

    const data = await response.json();
    return data.response.holidays;
  } catch (error) {
    console.error("Error fetching holidays:", error);
    showResult("Error fetching holiday information", true);
    return [];
  }
}

function displayHolidays(holidays) {
  const holidayList = document.getElementById("holidayList");
  holidayList.innerHTML = "<h3>Public Holidays for Birth Year:</h3>";

  holidays.sort((a, b) => new Date(a.date.iso) - new Date(b.date.iso));

  holidays.forEach((holiday) => {
    const holidayDiv = document.createElement("div");
    holidayDiv.className = "holiday-item";
    holidayDiv.innerHTML = `
            <span class="holiday-date">${new Date(
              holiday.date.iso
            ).toLocaleDateString()}</span>
            - ${holiday.name}
        `;
    holidayList.appendChild(holidayDiv);
  });
}

// Modify the checkHoliday function to include holiday fetching
async function checkHoliday() {
  const idInput = document.getElementById("idNumber").value;

  if (!validateIdNumber(idInput)) {
    return;
  }

  // Get decoded information
  const decodedInfo = decodeIdNumber(idInput);

  // Update database record
  updateSearchRecord(idInput, decodedInfo);

  // Display decoded information
  const decodedDiv = document.getElementById("decodedInfo");
  decodedDiv.innerHTML = `
        <h3>Decoded ID Information:</h3>
        <p>Date of Birth: ${decodedInfo.dateOfBirth}</p>
        <p>Gender: ${decodedInfo.gender}</p>
        <p>Citizenship Status: ${decodedInfo.citizenship}</p>
    `;

  // Extract year from date of birth
  const birthYear = decodedInfo.dateOfBirth.split("/")[2];

  // Check if birthday is a holiday
  const birthMonth = idInput.substring(2, 4);
  const birthDay = idInput.substring(4, 6);
  const dateKey = birthMonth + birthDay;

  if (holidays[dateKey]) {
    showResult(`Your birthday falls on ${holidays[dateKey]}! 🎉`, false);
  } else {
    showResult(
      "Your birthday does not fall on any major South African public holiday.",
      false
    );
  }

  // Fetch and display holidays for birth year
  const yearHolidays = await fetchHolidays(birthYear);
  displayHolidays(yearHolidays);

  // Store holidays in IndexedDB
  const transaction = db.transaction(["idRecords"], "readwrite");
  const store = transaction.objectStore("idRecords");
  const getRequest = store.get(idInput);

  getRequest.onsuccess = (event) => {
    const record = event.target.result;
    if (record) {
      record.birthYearHolidays = yearHolidays;
      store.put(record);
    }
  };
}
