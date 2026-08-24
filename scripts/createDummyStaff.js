require("dotenv").config();

const supabase = require("../config/supabase");

const userList = [
  {
    email: "admin.test@lpia.com",
    password: "admin12345",
    full_name: "Administrator Testing",
    role: "admin",
  },
  {
    email: "guru.test@lpia.com",
    password: "guru12345",
    full_name: "Guru Testing",
    role: "guru",
  },
];

async function createOrUpdateStaffAccount(email, password, full_name, role) {
  console.log(`Processing ${role}: ${email}`);

  let user = null;
  let authError = null;
  let existingAuthUser = null;

  // 1. Check if auth user exists by email
  const { data: users, error: searchError } =
    await supabase.auth.admin.listUsers();
  if (searchError) {
    console.error("Error listing users:", searchError.message);
    return;
  }

  existingAuthUser = users.users.find((u) => u.email === email);

  if (existingAuthUser) {
    // User exists, update password
    console.log(`Auth user ${email} already exists. Updating password.`);
    const { data: updatedUserData, error: updateError } =
      await supabase.auth.admin.updateUserById(existingAuthUser.id, {
        password: password,
      });
    if (updateError) {
      authError = updateError;
    } else {
      user = updatedUserData.user;
    }
  } else {
    // User does not exist, create new user
    console.log(`Auth user ${email} not found. Creating new user.`);
    const { data: newUserData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
        },
      });
    if (createError) {
      authError = createError;
    } else {
      user = newUserData.user;
    }
  }

  if (authError) {
    console.error(`Auth operation failed for ${email}:`, authError.message);
    return;
  }

  if (!user) {
    console.error(`Failed to get user data for ${email}.`);
    return;
  }

  // 2. Ensure profiles table has a matching record
  const { data: profile, error: fetchProfileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (fetchProfileError) {
    console.error(
      `Error fetching profile for ${email}:`,
      fetchProfileError.message,
    );
    return;
  }

  if (profile) {
    // Profile exists, update if necessary
    console.log(`Profile for ${email} already exists. Ensuring correct role.`);
    const { error: updateProfileError } = await supabase
      .from("profiles")
      .update({ full_name, role })
      .eq("id", user.id);
    if (updateProfileError) {
      console.error(
        `Error updating profile for ${email}:`,
        updateProfileError.message,
      );
    }
  } else {
    // Profile does not exist, insert new profile
    console.log(`Profile for ${email} not found. Creating new profile.`);
    const { error: insertProfileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name,
      role,
    });
    if (insertProfileError) {
      console.error(
        `Error inserting profile for ${email}:`,
        insertProfileError.message,
      );
    }
  }

  console.log(`SUCCESS ${role}: ${email} (Auth ID: ${user.id})`);
}

async function run() {
  for (const staff of userList) {
    await createOrUpdateStaffAccount(
      staff.email,
      staff.password,
      staff.full_name,
      staff.role,
    );
  }
}

run();