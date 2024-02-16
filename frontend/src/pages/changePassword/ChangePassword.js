import React, { useState } from "react";
import Card from "../../components/card/Card";
import "./ChangePassword.scss";
import PageMenu from "../../components/pageMenu/PageMenu";
import PasswordInput from "../../components/passwordInput/PasswordInput";

const initialState = {
  oldPassword: "",
  password: "",
  password2: "",
};

const ChangePassword = () => {
  const [formData, setFormData] = useState(initialState);

  const { oldPassword, password, password2 } = formData;

  const handleInputChange = () => {};

  return (
    <>
      <section>
        <div className="container">
          <PageMenu />
          <h2>Change Password</h2>
          <div className="--flex-start profile">
            <Card cardClass={"card"}>
              <div>
                <form>
                  <p>
                    <label>Current Passworrd:</label>
                    <PasswordInput
                      placeholder="Old Password"
                      name="password"
                      value={oldPassword}
                      onChange={handleInputChange}
                    />
                  </p>
                  <p>
                    <label>New Password:</label>
                    <PasswordInput
                      placeholder="New Password"
                      name="password"
                      value={password}
                      onChange={handleInputChange}
                    />
                  </p>
                  <p>
                    <label>Confirm New Password:</label>
                    <PasswordInput
                      placeholder="Confirm New Password"
                      name="password2"
                      value={password2}
                      onChange={handleInputChange}
                    />
                  </p>
                  <button className="--btn --btn-danger --btn-block">
                    Change Password
                  </button>
                </form>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
};

export default ChangePassword;
