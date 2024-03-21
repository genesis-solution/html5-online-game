-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 20, 2024 at 02:28 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `html5_game`
--

-- --------------------------------------------------------

--
-- Table structure for table `players`
--

CREATE TABLE `players` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `players`
--

INSERT INTO `players` (`id`, `username`, `password`) VALUES
(1, 'user1', 'password'),
(2, 'user2', 'password');

-- --------------------------------------------------------

--
-- Table structure for table `player_results`
--

CREATE TABLE `player_results` (
  `id` int(11) NOT NULL,
  `score` int(11) NOT NULL DEFAULT 0,
  `user` varchar(256) NOT NULL,
  `opponentScore` int(11) NOT NULL DEFAULT 0,
  `oppenent` varchar(256) DEFAULT NULL,
  `room` varchar(256) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_general_ci;

--
-- Dumping data for table `player_results`
--

INSERT INTO `player_results` (`id`, `score`, `user`, `opponentScore`, `oppenent`, `room`, `created_at`) VALUES
(1, 2, 'user1', 1, 'user2', 'Room-1', '2024-03-19 18:06:54'),
(2, 1, 'user2', 2, 'user1', 'Room-Tue Mar 19 2024 18:09:51 GMT-0700 (Pacific Daylight Time)', '2024-03-19 18:11:53'),
(3, 3, 'user2', 2, 'user1', 'Room-1710897191066', '2024-03-19 18:15:13'),
(4, 5, 'user1', 2, '', 'Computer', '2024-03-19 18:20:35'),
(5, 0, 'user2', 0, 'user1', 'Room-1710897491996', '2024-03-19 18:23:37'),
(6, 2, 'user1', 1, 'user2', 'Room-1710897833821', '2024-03-19 18:25:55');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `players`
--
ALTER TABLE `players`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `player_results`
--
ALTER TABLE `player_results`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `players`
--
ALTER TABLE `players`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `player_results`
--
ALTER TABLE `player_results`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
