const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function seed() {
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('cliniccarepro');
        console.log('Connected to MongoDB for seeding...');

        // Clear existing collections for a clean, cohesive slate
        await db.collection('users').deleteMany({});
        await db.collection('appointments').deleteMany({});
        await db.collection('login_history').deleteMany({});
        await db.collection('vitals').deleteMany({});
        await db.collection('billing').deleteMany({});
        await db.collection('medical_records').deleteMany({});
        await db.collection('prescriptions').deleteMany({});
        await db.collection('inventory').deleteMany({});
        await db.collection('suppliers').deleteMany({});
        await db.collection('departments').deleteMany({});
        console.log('Cleared existing collection data.');

        // 1. Seed Users (Admin, Doctor, Receptionist, Patient, Vital, Pharma)
        const usersCol = db.collection('users');
        
        const adminPass = await bcrypt.hash('admin123', 10);
        const doctorPass = await bcrypt.hash('doctor123', 10);
        const recepPass = await bcrypt.hash('receptionist123', 10);
        const patientPass = await bcrypt.hash('patient123', 10);
        const vitalPass = await bcrypt.hash('vital123', 10);
        const pharmaPass = await bcrypt.hash('pharma123', 10);

        const adminUser = {
            name: 'Admin User',
            email: 'admin@clinic.com',
            password: adminPass,
            role: 'admin',
            phone: '1234567890',
            blocked: false,
            createdAt: new Date()
        };

        const doctorUser = {
            name: 'Dr. Sarah Chen',
            email: 'sarah@clinic.com',
            password: doctorPass,
            role: 'doctor',
            phone: '9876543210',
            specialization: 'Cardiology',
            blocked: false,
            createdAt: new Date()
        };

        const receptionistUser = {
            name: 'Jane Smith',
            email: 'receptionist@clinic.com',
            password: recepPass,
            role: 'receptionist',
            phone: '555-0122',
            blocked: false,
            createdAt: new Date()
        };

        const patientUser = {
            name: 'John Doe',
            email: 'john@example.com',
            password: patientPass,
            role: 'patient',
            phone: '555-0199',
            blocked: false,
            createdAt: new Date()
        };

        const vitalUser = {
            name: 'Vital Monitor Nurse',
            email: 'vital@clinic.com',
            password: vitalPass,
            role: 'vital',
            phone: '555-0188',
            blocked: false,
            createdAt: new Date()
        };

        const pharmaUser = {
            name: 'Pharmacy Manager',
            email: 'pharma@clinic.com',
            password: pharmaPass,
            role: 'pharma',
            phone: '555-0177',
            blocked: false,
            createdAt: new Date()
        };

        const adminRes = await usersCol.insertOne(adminUser);
        const doctorRes = await usersCol.insertOne(doctorUser);
        const recepRes = await usersCol.insertOne(receptionistUser);
        const patientRes = await usersCol.insertOne(patientUser);
        const vitalRes = await usersCol.insertOne(vitalUser);
        const pharmaRes = await usersCol.insertOne(pharmaUser);

        const patientId = patientRes.insertedId.toString();
        const doctorId = doctorRes.insertedId.toString();

        console.log('Seeded roles and retrieved IDs:');
        console.log(`- Patient (John Doe) ID: ${patientId}`);
        console.log(`- Doctor (Dr. Sarah Chen) ID: ${doctorId}`);

        // 2. Seed Connected Appointments
        const appointmentsCol = db.collection('appointments');
        const today = new Date().toISOString().slice(0, 10);
        
        await appointmentsCol.insertMany([
            {
                patientId: patientId,
                patient: 'John Doe',
                doctorId: doctorId,
                doctor: 'Dr. Sarah Chen',
                date: today,
                time: '10:00',
                status: 'confirmed',
                reason: 'Regular Cardiology Checkup'
            },
            {
                patientId: patientId,
                patient: 'John Doe',
                doctorId: doctorId,
                doctor: 'Dr. Sarah Chen',
                date: '2026-06-20',
                time: '14:30',
                status: 'pending',
                reason: 'Follow-up Consultation'
            }
        ]);
        console.log('Seeded linked appointments.');

        // 3. Seed Vitals for John Doe
        const vitalsCol = db.collection('vitals');
        await vitalsCol.insertMany([
            {
                patientId: patientId,
                patientName: 'John Doe',
                date: today,
                bpSystolic: 120,
                bpDiastolic: 80,
                pulse: '72',
                temperature: '98.6',
                status: 'Normal'
            },
            {
                patientId: patientId,
                patientName: 'John Doe',
                date: '2026-05-10',
                bpSystolic: 135,
                bpDiastolic: 88,
                pulse: '78',
                temperature: '99.1',
                status: 'Warning'
            }
        ]);
        console.log('Seeded linked vitals.');

        // 4. Seed Medical Records & Prescriptions
        const medicalRecordsCol = db.collection('medical_records');
        await medicalRecordsCol.insertOne({
            patientId: patientId,
            patient: 'John Doe',
            doctorId: doctorId,
            doctor: 'Dr. Sarah Chen',
            diagnosis: 'Mild Hypertension',
            notes: 'Patient exhibits slightly elevated blood pressure. Recommended reduction in daily salt intake and mild daily exercise.',
            date: '2026-05-10'
        });

        const prescriptionsCol = db.collection('prescriptions');
        await prescriptionsCol.insertOne({
            patientId: patientId,
            patient: 'John Doe',
            doctorId: doctorId,
            medication: 'Lisinopril',
            dosage: '10mg daily',
            instructions: 'Take 1 tablet by mouth each morning',
            refills: 3,
            date: '2026-05-10'
        });
        console.log('Seeded medical records & prescriptions.');

        // 5. Seed Billing Invoices
        const billingCol = db.collection('billing');
        await billingCol.insertMany([
            {
                patientId: patientId,
                patient: 'John Doe',
                description: 'Cardiology Consultation Fee',
                amount: 500,
                status: 'paid',
                date: today
            },
            {
                patientId: patientId,
                patient: 'John Doe',
                description: 'Electrocardiogram (ECG) Diagnostic Test',
                amount: 1500,
                status: 'pending',
                date: today
            }
        ]);
        console.log('Seeded billing invoices.');

        // 6. Seed Pharmacy Inventory
        const inventoryCol = db.collection('inventory');
        await inventoryCol.insertMany([
            {
                name: 'Paracetamol',
                batch: 'PRT-2026-01',
                qty: 150,
                price: 15,
                expiry: '2028-12-31'
            },
            {
                name: 'Amoxicillin',
                batch: 'AMX-2026-03',
                qty: 12,
                price: 45,
                expiry: '2027-06-30'
            },
            {
                name: 'Lisinopril',
                batch: 'LSN-2026-09',
                qty: 85,
                price: 30,
                expiry: '2028-09-15'
            }
        ]);
        console.log('Seeded pharmacy inventory.');

        // 7. Seed Suppliers
        const suppliersCol = db.collection('suppliers');
        await suppliersCol.insertMany([
            {
                name: 'Apex Pharma Distributors',
                phone: '1-800-555-0144',
                email: 'orders@apexpharma.com'
            },
            {
                name: 'MedLife Supplies Co.',
                phone: '1-888-555-0166',
                email: 'sales@medlifesupplies.com'
            }
        ]);
        console.log('Seeded pharmaceutical suppliers.');

        // 8. Seed Departments
        const departmentsCol = db.collection('departments');
        await departmentsCol.insertMany([
            {
                name: 'Cardiology',
                head: 'Dr. Sarah Chen',
                staffCount: 8
            },
            {
                name: 'Neurology',
                head: 'Dr. James Wilson',
                staffCount: 5
            },
            {
                name: 'Emergency Medicine',
                head: 'Dr. Michael Chang',
                staffCount: 14
            }
        ]);
        console.log('Seeded departments list.');

        // 9. Seed Login History
        const loginHistoryCol = db.collection('login_history');
        await loginHistoryCol.insertOne({
            userId: doctorId,
            userName: 'Dr. Sarah Chen',
            email: 'sarah@clinic.com',
            role: 'doctor',
            timestamp: new Date(),
            ip: '127.0.0.1',
            status: 'success'
        });

        console.log('DATABASE SEEDING SUCCESSFULLY COMPLETED!');
    } catch (e) {
        console.error('Seeding failed with error:', e);
    } finally {
        await client.close();
    }
}

seed();
