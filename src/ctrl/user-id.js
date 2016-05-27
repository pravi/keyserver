/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2016 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

/**
 * Database documents have the format:
 * {
 *   _id: ObjectID, // randomly generated by MongoDB
 *   email: "jon@example.com", // the email address in lowercase
 *   name: "Jon Smith",
 *   keyid: "02C134D079701934", // id of the public key document in uppercase hex
 *   nonce: "123e4567-e89b-12d3-a456-426655440000", // verifier used to prove ownership
 *   verified: true // if the user ID has been verified
 * }
 */
const DB_TYPE = 'userid';

/**
 * A controller that handles User ID queries to the database
 */
class UserId {

  /**
   * Create an instance of the controller
   * @param {Object} mongo   An instance of the MongoDB client
   */
  constructor(mongo) {
    this._mongo = mongo;
  }

  /**
   * Store a list of user ids. There can only be one verified user ID for
   * an email address at any given time.
   * @param {String} options.keyid     The public key id
   * @param {Array}  options.userIds   The userIds to persist
   * @yield {Array}                    A list of user ids with generated nonces
   */
  *batch(options) {
    options.userIds.forEach(u => u.keyid = options.keyid); // set keyid on docs
    let r = yield this._mongo.batch(options.userIds, DB_TYPE);
    if (r.insertedCount !== options.userIds.length) {
      throw new Error('Failed to persist user ids');
    }
  }

  /**
   * Get a verified user IDs either by key id or email address.
   * There can only be one verified user ID for an email address
   * at any given time.
   * @param {String} options.keyid     The public key id
   * @param {String} options.userIds   A list of user ids to check
   * @yield {Object}                   The verified user ID document
   */
  *getVerfied(options) {
    let keyid = options.keyid, userIds = options.userIds;
    if (keyid) {
      // try by key id
      let uids = yield this._mongo.list({ keyid }, DB_TYPE);
      let verified = uids.find(u => u.verified);
      if (verified) {
        return verified;
      }
    }
    if (userIds) {
      // try by email addresses
      for (let uid of userIds) {
        let uids = yield this._mongo.list({ email:uid.email }, DB_TYPE);
        let verified = uids.find(u => u.verified);
        if (verified) {
          return verified;
        }
      }
    }
  }

  /**
   * Remove all user ids matching a certain query
   * @param {String} options.keyid   The public key id
   * @yield {undefined}
   */
  *remove(options) {
    yield this._mongo.remove({ keyid:options.keyid }, DB_TYPE);
  }

}

module.exports = UserId;