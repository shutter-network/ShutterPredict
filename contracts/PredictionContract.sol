// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title PredictionContract
 * @notice Stores encrypted predictions (commitments) on-chain,
 *         then allows reveal with optional deadline constraints.
 */
contract PredictionContract {
    struct Prediction {
        address predictor;
        bytes encryptedCommitment; // Shutter-encrypted data
        uint256 revealTime;        // Timestamp after which user can reveal
        string revealed;           // Plaintext result (after Shutter key release)
        bool isRevealed;
        string shutterIdentity;    // Shutter identity associated with the prediction
    }

    mapping(uint256 => Prediction) public predictions;
    uint256 public predictionCount;

    event PredictionCommitted(
        uint256 indexed id,
        address indexed predictor,
        bytes encryptedData,
        uint256 revealTime,
        string shutterIdentity
    );
    event PredictionRevealed(
        uint256 indexed id,
        address indexed predictor,
        string revealedText
    );

    /**
     * @dev Commit an encrypted prediction. Optionally set a specific reveal time.
     * @param _encryptedData The Shutter-encrypted bytes.
     * @param _revealTime The earliest block timestamp the user can reveal (0 if no on-chain time check).
     * @param _shutterIdentity The Shutter identity of the user making the prediction.
     */
    function commitPrediction(
        bytes calldata _encryptedData, 
        uint256 _revealTime, 
        string calldata _shutterIdentity
    )
        external
    {
        predictions[predictionCount] = Prediction({
            predictor: msg.sender,
            encryptedCommitment: _encryptedData,
            revealTime: _revealTime,
            revealed: "",
            isRevealed: false,
            shutterIdentity: _shutterIdentity
        });

        emit PredictionCommitted(
            predictionCount,
            msg.sender,
            _encryptedData,
            _revealTime,
            _shutterIdentity
        );
        predictionCount++;
    }

    /**
     * @dev Reveal the plaintext after the Shutter key is released.
     *      Optionally enforce on-chain revealTime check.
     * @param _id ID of the prediction in the contract storage.
     * @param _plaintext The decrypted text (off-chain).
     */
    function revealPrediction(uint256 _id, string calldata _plaintext) external {
        Prediction storage p = predictions[_id];
        require(!p.isRevealed, "Already revealed");
        require(p.predictor == msg.sender, "Not your prediction");

        // If you want on-chain gating by time:
        // require(block.timestamp >= p.revealTime, "Reveal time not reached yet");

        p.revealed = _plaintext;
        p.isRevealed = true;

        emit PredictionRevealed(_id, msg.sender, _plaintext);
    }

    /**
     * @notice (Optional) Returns the complete Prediction struct for a given ID,
     *         useful if you don't want to rely on the default public getter.
     */
    function getPrediction(uint256 _id)
        external
        view
        returns (
            address predictor,
            bytes memory encryptedData,
            uint256 revealTime,
            string memory revealedText,
            bool revealedFlag,
            string memory shutterIdentity
        )
    {
        Prediction storage p = predictions[_id];
        return (
            p.predictor,
            p.encryptedCommitment,
            p.revealTime,
            p.revealed,
            p.isRevealed,
            p.shutterIdentity
        );
    }
}
