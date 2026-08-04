// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PortfolioOwnership
 * @notice Minimal ERC-721 collection representing ownership of flagship
 *         portfolio projects. Metadata (name, artwork, attributes) lives on
 *         IPFS; only the token URI is stored on-chain.
 */
contract PortfolioOwnership is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId = 1;

    mapping(string => uint256) private _projectToken;

    event ProjectMinted(uint256 indexed tokenId, string projectRef, string tokenURI, address indexed owner);

    error ProjectAlreadyMinted(string projectRef);

    constructor(string memory name_, string memory symbol_, address initialOwner)
        ERC721(name_, symbol_)
        Ownable(initialOwner)
    {}

    /// @notice Mint a collectible for a flagship project. One token per project.
    function mintProject(address to, string calldata projectRef, string calldata uri)
        external
        onlyOwner
        returns (uint256 tokenId)
    {
        if (_projectToken[projectRef] != 0) revert ProjectAlreadyMinted(projectRef);

        unchecked {
            tokenId = _nextTokenId++;
        }
        _projectToken[projectRef] = tokenId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        emit ProjectMinted(tokenId, projectRef, uri, to);
    }

    function tokenOfProject(string calldata projectRef) external view returns (uint256) {
        return _projectToken[projectRef];
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}
