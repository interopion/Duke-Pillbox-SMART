#Duke Pillbox Data Requirements

The Duke pillbox App consumes multiple types of data from different data sources
but if we exclude some things like localizations and configuration, we can reduce
the list to three major data sources:

1. Data about the patient
2. Data about the patient medications
3. Predefined list of medications to choose from

###Data about the patient
The patient is fetched from SMART if the app has been launched with patient context.
Otherwise (like in standalone mode) the patient is empty and can be entered manually.
Getting the patient from smart is done via the smart client library with JS like:
```js
smart.context.patient.read()
```
That gives something like https://fhir-open-api-dstu1.smarthealthit.org/Patient/1288992?_format=json
but the pillbox is only interested in three properties of the patient. This snipped should
illustrate what we are using (if `pt` is the JSON response):
```js
PATIENT.set({
    name      : pt.name[0].given.join(" ") + " " +  pt.name[0].family.join(" "),
    mrn       : pt.identifier[0].value,
    birthdate : pt.birthDate
});
```

###Data about the patient medications

After we have the patient, we are building another request to fetch his mediacations from his prescriptions.
The response looks like this: https://fhir-open-api-dstu1.smarthealthit.org/MedicationPrescription/_search?patient%3APatient=1288992&_format=json
From that, with a little bit of parsing we are building a list of medications that we know that the current patient should take.
At this point each medication is just a simple object with `name`, `rxnorm` code and `dosage` instructions.

###Predefined list of medications
In addition to the meds fount is SMART for the given patient, we have additional list of predefined medications.
They exist so that one can add new meds to the patient's med list and customize the exercise.
These medications have only name and rsnorm code and are hardcoded within the pillbox app - https://github.com/medapptech/pillbox/blob/master/pillbox-2.0/src/rxnorm.js
New meds can be added there if needed but the app will have to be rebuilt after that
