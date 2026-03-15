-- Create tables for the clinic management system

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users PRIMARY KEY,
    full_name TEXT,
    clinic_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Doctors table
CREATE TABLE doctors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    department TEXT,
    specialization TEXT,
    experience INTEGER,
    status TEXT DEFAULT 'active',
    clinic_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Receptionists table
CREATE TABLE receptionists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    shift TEXT,
    status TEXT DEFAULT 'active',
    clinic_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Appointments table (optional - for future expansion)
CREATE TABLE appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_name TEXT NOT NULL,
    patient_email TEXT,
    patient_phone TEXT,
    doctor_id UUID REFERENCES doctors(id),
    appointment_date DATE,
    appointment_time TIME,
    status TEXT DEFAULT 'scheduled',
    clinic_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Patients table (optional - for future expansion)
CREATE TABLE patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    date_of_birth DATE,
    address TEXT,
    clinic_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE receptionists ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Create policies for doctors
CREATE POLICY "Users can view their clinic doctors" ON doctors
    FOR SELECT USING (auth.uid() = clinic_id);

CREATE POLICY "Users can insert doctors" ON doctors
    FOR INSERT WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Users can update their clinic doctors" ON doctors
    FOR UPDATE USING (auth.uid() = clinic_id);

CREATE POLICY "Users can delete their clinic doctors" ON doctors
    FOR DELETE USING (auth.uid() = clinic_id);

-- Create policies for receptionists
CREATE POLICY "Users can view their clinic receptionists" ON receptionists
    FOR SELECT USING (auth.uid() = clinic_id);

CREATE POLICY "Users can insert receptionists" ON receptionists
    FOR INSERT WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Users can update their clinic receptionists" ON receptionists
    FOR UPDATE USING (auth.uid() = clinic_id);

CREATE POLICY "Users can delete their clinic receptionists" ON receptionists
    FOR DELETE USING (auth.uid() = clinic_id);

-- Create policies for appointments
CREATE POLICY "Users can view their clinic appointments" ON appointments
    FOR SELECT USING (auth.uid() = clinic_id);

CREATE POLICY "Users can insert appointments" ON appointments
    FOR INSERT WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Users can update their clinic appointments" ON appointments
    FOR UPDATE USING (auth.uid() = clinic_id);

CREATE POLICY "Users can delete their clinic appointments" ON appointments
    FOR DELETE USING (auth.uid() = clinic_id);

-- Create policies for patients
CREATE POLICY "Users can view their clinic patients" ON patients
    FOR SELECT USING (auth.uid() = clinic_id);

CREATE POLICY "Users can insert patients" ON patients
    FOR INSERT WITH CHECK (auth.uid() = clinic_id);

CREATE POLICY "Users can update their clinic patients" ON patients
    FOR UPDATE USING (auth.uid() = clinic_id);

CREATE POLICY "Users can delete their clinic patients" ON patients
    FOR DELETE USING (auth.uid() = clinic_id);

-- Create indexes for better performance
CREATE INDEX idx_doctors_clinic_id ON doctors(clinic_id);
CREATE INDEX idx_doctors_department ON doctors(department);
CREATE INDEX idx_receptionists_clinic_id ON receptionists(clinic_id);
CREATE INDEX idx_receptionists_shift ON receptionists(shift);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receptionists_updated_at BEFORE UPDATE ON receptionists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();