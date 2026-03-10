CREATE TABLE IF NOT EXISTS work_reqs (
  id INT AUTO_INCREMENT PRIMARY KEY,

  referenceNumber VARCHAR(50) NOT NULL,
  date DATE NOT NULL,

  techName VARCHAR(100) NOT NULL,
  account VARCHAR(150) NOT NULL,
  accountContact VARCHAR(150) NULL,
  accountAddress VARCHAR(255) NULL,

  actionRequired VARCHAR(255) NULL,
  numberOfPlants INT NULL,

  plantWanted VARCHAR(150) NULL,
  plantReplaced VARCHAR(150) NULL,
  plantSize VARCHAR(50) NULL,
  plantHeight VARCHAR(50) NULL,

  planterTypeSize VARCHAR(150) NULL,
  planterColour VARCHAR(100) NULL,
  stagingMaterial VARCHAR(255) NULL,

  lighting VARCHAR(50) NULL,
  method VARCHAR(255) NULL,
  location VARCHAR(150) NULL,
  notes TEXT NULL,

  picturePath VARCHAR(255) NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);